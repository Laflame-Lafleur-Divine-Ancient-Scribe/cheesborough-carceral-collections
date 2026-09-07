'use strict';
const crypto=require('node:crypto');
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
const validEmail=value=>typeof value==='string' && value.length<=254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
function createAccountEmailService({db,ensureSchema,parseBody,json,rate,rateEmail,mail,hashPassword,siteUrl}) {
  return async function handle(request,response,pathname) {
    if (!db()) return json(response,503,{error:'Account services are temporarily unavailable.'});
    await ensureSchema();
    if (!await rate(request,'password-reset',8,900)) return json(response,429,{error:'Please wait before trying again.'});
    const body=await parseBody(request,4000);
    if (pathname==='/api/auth/forgot-password') {
      const email=String(body?.email||'').trim().toLowerCase();
      if (!validEmail(email)) return json(response,400,{error:'Enter a valid email address.'});
      if (!mail.configured()) return json(response,503,{error:'Password-reset email is not connected yet. Please contact Contact@carceralcollections.org.'});
      const reply={ok:true,message:'If an active account uses that email, a reset link will arrive shortly. Check your spam folder too.'};
      if (!await rateEmail(digest(email))) return json(response,200,reply);
      const user=(await db().query("SELECT id FROM community_users WHERE lower(email)=$1 AND status='active'",[email])).rows[0];
      if (user) {
        const token=crypto.randomBytes(32).toString('hex');
        const tokenHash=digest(token);
        await db().query("INSERT INTO community_password_reset_tokens(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '30 minutes')",[user.id,tokenHash]);
        try {
          await mail.send({to:email,subject:'Reset Your Carceral Collections Password',text:`Use this link to choose a new password:\n\n${siteUrl()}/RESET-PASSWORD.html#token=${token}\n\nThe link expires in 30 minutes and can be used once. If you did not request this, you can ignore this email.`,idempotencyKey:`reset-${tokenHash}`});
        } catch {
          await db().query('DELETE FROM community_password_reset_tokens WHERE token_hash=$1',[tokenHash]);
          // Keep the public response identical for existing and unknown accounts.
          console.error('Password-reset delivery failed; check the email provider configuration.');
        }
      }
      return json(response,200,reply);
    }
    const token=String(body?.token||''),password=String(body?.password||'');
    if (!/^[a-f0-9]{64}$/.test(token) || password.length<10 || password.length>128) return json(response,400,{error:'Use a valid reset link and a password of 10–128 characters.'});
    const passwordHash=await hashPassword(password);
    const client=await db().connect();
    try {
      await client.query('BEGIN');
      const user=(await client.query("SELECT u.id FROM community_users u JOIN community_password_reset_tokens t ON t.user_id=u.id WHERE t.token_hash=$1 AND t.used_at IS NULL AND t.expires_at>now() AND u.status='active' FOR UPDATE OF u",[digest(token)])).rows[0];
      if (!user) { await client.query('ROLLBACK');return json(response,400,{error:'This reset link has expired or has already been used. Request a new link.'}); }
      const consumed=await client.query('UPDATE community_password_reset_tokens SET used_at=now() WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now() RETURNING id',[digest(token)]);
      if (!consumed.rows.length) {await client.query('ROLLBACK');return json(response,400,{error:'This reset link is no longer valid.'});}
      await client.query('UPDATE community_users SET password_hash=$1,session_version=session_version+1 WHERE id=$2',[passwordHash,user.id]);
      await client.query('UPDATE community_password_reset_tokens SET used_at=now() WHERE user_id=$1 AND used_at IS NULL',[user.id]);
      await client.query("INSERT INTO community_audit_log(user_id,event_type) VALUES($1,'password_reset')",[user.id]);
      await client.query('COMMIT');
      return json(response,200,{ok:true,message:'Your password has been changed. Sign in with your new password.'});
    } catch(error) {await client.query('ROLLBACK');throw error;} finally {client.release();}
  };
}
module.exports={createAccountEmailService,digest,validEmail};
