'use strict';
function createEmailDelivery({env=process.env,fetchImpl=globalThis.fetch,createTransport=options=>require('nodemailer').createTransport(options)}={}) {
  const from = () => env.EMAIL_FROM || env.CONTACT_FROM_EMAIL;
  const smtp = () => env.EMAIL_TRANSPORT==='smtp' || (!env.EMAIL_TRANSPORT && Boolean(env.SMTP_HOST));
  let transport;
  return {
    configured: () => Boolean(from() && !/[\r\n]/.test(from()) && (smtp() ? env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && [465,587].includes(Number(env.SMTP_PORT||465)) : env.RESEND_API_KEY)),
    async send({to,subject,text,replyTo,idempotencyKey,headers}) {
      if (!this.configured()) throw new Error('Email delivery is not configured');
      if(smtp()) {
        const port=Number(env.SMTP_PORT||465);
        transport ||= createTransport({host:env.SMTP_HOST,port,secure:port===465,requireTLS:true,auth:{user:env.SMTP_USER,pass:env.SMTP_PASS},connectionTimeout:12000,greetingTimeout:12000,socketTimeout:20000,disableFileAccess:true,disableUrlAccess:true});
        const receipt=await transport.sendMail({from:from(),to,subject,text,replyTo,headers,...(idempotencyKey?{messageId:`<${idempotencyKey}@carceralcollections.org>`}:{})});
        if(!receipt.accepted?.length || receipt.rejected?.length)throw new Error('Email was not accepted');
        return receipt.messageId;
      }
      const response = await fetchImpl('https://api.resend.com/emails', {
        method:'POST', signal:AbortSignal.timeout(12000),
        headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json',...(idempotencyKey?{'Idempotency-Key':idempotencyKey}:{})},
        body:JSON.stringify({from:from(),to:Array.isArray(to)?to:[to],subject,text,...(replyTo?{reply_to:replyTo}:{}),...(headers?{headers}:{})})
      });
      const receipt=await response.json().catch(()=>null);
      if (!response.ok || typeof receipt?.id!=='string' || !receipt.id) throw new Error('Email was not accepted');
      return receipt.id;
    }
  };
}
module.exports={createEmailDelivery};
