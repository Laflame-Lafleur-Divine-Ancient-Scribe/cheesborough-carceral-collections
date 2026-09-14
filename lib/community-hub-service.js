'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {
  ensureBotUsers,
  seedInitialDiscussions,
  seedNetworkGraph,
  scheduleBotActivity
} = require('./community-bots');

/**
 * Meta-Style Affinity Algorithm
 * Computes recommendation score (68-98%) and contextual reasons based on:
 * - Triadic closure / mutual connections in the social graph
 * - Geographic proximity and Florida DOC regional overlap
 * - Research interests and semantic tag token matching
 * - Complementary carceral research roles
 * - Historical interactions and discussion activity
 */
function computeMetaAffinity(userProfile, candidate, networkData = {}) {
  let score = 55;
  const reasons = [];

  // 1. Social Graph Proximity (Triadic Closure - Mutual Connections)
  let mutualCount = 0;
  if (networkData.mutualCounts && typeof networkData.mutualCounts[candidate.id] === 'number') {
    mutualCount = networkData.mutualCounts[candidate.id];
  } else if (networkData.connectionsByUser) {
    const userConns = (userProfile && networkData.connectionsByUser.get(userProfile.id)) || new Set();
    const candConns = networkData.connectionsByUser.get(candidate.id) || new Set();
    for (const connId of userConns) {
      if (candConns.has(connId)) mutualCount++;
    }
  }
  if (mutualCount > 0) {
    const boost = Math.min(mutualCount * 15, 30);
    score += boost;
    reasons.push(`${mutualCount} mutual connection${mutualCount > 1 ? 's' : ''}`);
  }

  // 2. Geographic & DOC Jurisdictional Alignment
  const userLoc = String(userProfile?.profile_location || userProfile?.location || '').toLowerCase().trim();
  const candLoc = String(candidate.profile_location || candidate.location || '').toLowerCase().trim();
  if (userLoc && candLoc) {
    const isFloridaMatch = (userLoc.includes('fl') || userLoc.includes('florida')) && (candLoc.includes('fl') || candLoc.includes('florida'));
    const isExactMatch = userLoc.includes(candLoc) || candLoc.includes(userLoc);
    if (isFloridaMatch || isExactMatch) {
      score += 18;
      reasons.push('Shared DOC jurisdiction & regional records');
    }
  }

  // 3. Research Topic & Interest Overlap (Jaccard / Token Similarity)
  const extractTokens = (text) => {
    return (String(text || '').toLowerCase().match(/[a-z]{4,}/g) || [])
      .filter(w => !['with', 'from', 'that', 'this', 'have', 'were', 'been', 'their', 'about', 'research', 'records', 'prison'].includes(w));
  };

  let userInterestsArr = [];
  try {
    userInterestsArr = typeof userProfile?.profile_interests === 'string' ? JSON.parse(userProfile.profile_interests) : (userProfile?.profile_interests || []);
  } catch (_) {}

  let candInterestsArr = [];
  try {
    candInterestsArr = typeof candidate.profile_interests === 'string' ? JSON.parse(candidate.profile_interests) : (candidate.profile_interests || candidate.interests || []);
  } catch (_) {}

  const userPostTags = (networkData.userPostTags && userProfile) ? (networkData.userPostTags.get(userProfile.id) || []) : [];
  const candPostTags = networkData.userPostTags ? (networkData.userPostTags.get(candidate.id) || []) : [];

  const userTokens = new Set([
    ...extractTokens(userProfile?.profile_about),
    ...extractTokens(userProfile?.profile_now),
    ...userInterestsArr.map(i => String(i).toLowerCase()),
    ...userPostTags
  ]);

  const candTokens = [
    ...extractTokens(candidate.profile_about || candidate.about),
    ...extractTokens(candidate.profile_now || candidate.now),
    ...candInterestsArr.map(i => String(i).toLowerCase()),
    ...candPostTags
  ];

  const matchedTokens = candTokens.filter(t => userTokens.has(t));
  const uniqueMatches = [...new Set(matchedTokens)];
  if (uniqueMatches.length > 0) {
    score += Math.min(uniqueMatches.length * 8, 24);
    const label = uniqueMatches.slice(0, 2).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' & ');
    reasons.push(`Shared focus: ${label}`);
  }

  // 4. Role Complementarity
  const candRole = String(candidate.role || 'member').toLowerCase();
  if (['archivist', 'investigator', 'watchdog', 'forensic', 'advocate'].includes(candRole)) {
    score += 12;
    reasons.push(`Active ${candRole} researcher`);
  }

  // 5. Yard Interaction History
  if (userProfile && networkData.interactionsBetween) {
    const interactionCount = (networkData.interactionsBetween.get(`${userProfile.id}:${candidate.id}`) || 0);
    if (interactionCount > 0) {
      score += 14;
      reasons.push('Interacted in Yard discussions');
    }
  }

  if (reasons.length === 0) {
    reasons.push('Verified carceral collections contributor');
  }

  const matchScore = Math.min(Math.max(score, 68), 98);
  return {
    matchScore,
    matchReason: reasons.slice(0, 2).join(' • ')
  };
}

function createCommunityHubService(deps) {
  const { db, ensureSchema, user: getUser, json, parseBody, rate } = deps;
  let migrationPromise = null;
  let botIntervalStarted = false;

  function ensureBotTicker(database) {
    if (botIntervalStarted) return;
    botIntervalStarted = true;
    const interval = setInterval(() => {
      scheduleBotActivity(database).catch(err => {
        console.warn('Bot activity scheduler warning:', err.message);
      });
    }, 48 * 60 * 1000); // 30 times spread across 24 hours (every 48 minutes)
    if (interval && interval.unref) interval.unref();
  }

  async function ensure() {
    const database = db();
    if (!database) throw new Error('Database connection unavailable');
    await ensureSchema();
    if (!migrationPromise) {
      const sqlPath1 = path.join(__dirname, '../db/migrations/20260913-community-yard.sql');
      const sqlPath2 = path.join(__dirname, '../db/migrations/20260913-cases-watching-and-connections.sql');
      const sqlPath3 = path.join(__dirname, '../db/migrations/20260913-community-inbox-and-messaging.sql');
      const runMigrations = async () => {
        if (fs.existsSync(sqlPath1)) {
          await database.query(fs.readFileSync(sqlPath1, 'utf8'));
        }
        if (fs.existsSync(sqlPath2)) {
          await database.query(fs.readFileSync(sqlPath2, 'utf8'));
        } else {
          await database.query(`
            ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS media_url text;
            CREATE TABLE IF NOT EXISTS community_connections (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                requester_id uuid NOT NULL REFERENCES community_users(id) ON DELETE CASCADE,
                receiver_id uuid NOT NULL REFERENCES community_users(id) ON DELETE CASCADE,
                status varchar(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
                created_at timestamptz NOT NULL DEFAULT now(),
                updated_at timestamptz NOT NULL DEFAULT now(),
                CONSTRAINT uq_community_connections UNIQUE (requester_id, receiver_id)
            );
            CREATE INDEX IF NOT EXISTS community_connections_receiver_idx ON community_connections(receiver_id, status);
            CREATE INDEX IF NOT EXISTS community_connections_requester_idx ON community_connections(requester_id, status);
          `);
        }
        if (fs.existsSync(sqlPath3)) {
          await database.query(fs.readFileSync(sqlPath3, 'utf8'));
        } else {
          await database.query(`
            CREATE TABLE IF NOT EXISTS community_messages (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                sender_id uuid REFERENCES community_users(id) ON DELETE CASCADE,
                recipient_id uuid NOT NULL REFERENCES community_users(id) ON DELETE CASCADE,
                subject varchar(150),
                content text NOT NULL,
                read boolean NOT NULL DEFAULT false,
                created_at timestamptz NOT NULL DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS community_messages_recipient_idx ON community_messages(recipient_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS community_messages_sender_idx ON community_messages(sender_id, created_at DESC);
          `);
        }
        await seedInitialPosts(database);
        // Cleanup any legacy formulaic comments and re-seed humanized discussions
        await database.query(`
          DELETE FROM community_post_comments
          WHERE content LIKE '%Spot on analysis. In federal court, conspiracy charges on%'
             OR content LIKE '%And watch how 12 writes their supplementary narrative%'
             OR content LIKE '%Big facts! People on social media speak on%'
             OR content LIKE '%Charley seen this cycle repeat for forty years%'
             OR content LIKE '%Law library receipt: Check the 4th Amendment suppression rulings%'
             OR content LIKE '%Real talk. They try to paint every defendant%'
             OR content LIKE '%This touches families in every county%'
             OR content LIKE '%Critical point on %'
        `);
        await seedInitialDiscussions(database);
        await seedNetworkGraph(database);
        ensureBotTicker(database);

        // Cleanup: Ensure real users (e.g. Manibani) have 0 posts and no archival seeds mistakenly attributed to them
        try {
          const botAuthorRes = await database.query("SELECT id FROM community_users WHERE email LIKE '%@carceralcollections.internal' ORDER BY created_at ASC LIMIT 1");
          if (botAuthorRes.rows.length > 0) {
            const botAuthorId = botAuthorRes.rows[0].id;
            await database.query(`
              UPDATE community_posts
              SET author_id = $1
              WHERE author_id IN (
                SELECT id FROM community_users
                WHERE lower(display_name) LIKE '%manibani%' OR lower(username) LIKE '%manibani%'
              )
            `, [botAuthorId]);

            await database.query(`
              UPDATE community_post_comments
              SET author_id = $1
              WHERE author_id IN (
                SELECT id FROM community_users
                WHERE lower(display_name) LIKE '%manibani%' OR lower(username) LIKE '%manibani%'
              )
            `, [botAuthorId]);
          }
        } catch (cleanupErr) {
          console.warn('Manibani post cleanup warning:', cleanupErr.message);
        }
      };
      migrationPromise = runMigrations().catch(err => {
        migrationPromise = null;
        throw err;
      });
    }
    return migrationPromise;
  }

  async function seedInitialPosts(database) {
    try {
      const existing = await database.query('SELECT count(*)::int AS count FROM community_posts');
      if (Number(existing.rows[0]?.count || 0) > 0) return;

      const userRes = await database.query("SELECT id FROM community_users WHERE email LIKE '%@carceralcollections.internal' ORDER BY created_at ASC LIMIT 1");
      if (!userRes.rows.length) return;
      const authorId = userRes.rows[0].id;

      const seeds = [
        {
          category: 'watch',
          content: '[ARCHIVAL ALERT] Unsealed 1974 Lake Butler inspection reports corroborate missing records referenced in inmate transfers. Case docket #FL-74-889 has been digitized and logged into the Law Library collections. What threads are you tracking today?',
          tags: JSON.stringify(['LakeButler', 'UnsealedRecords', 'Watch']),
          pinned: true
        },
        {
          category: 'investigation',
          content: 'Reviewing the 1928 chain gang labor contracts from Putnam County. Notice the discrepancy between county commissioner minutes and state road department ledger numbers. Anyone working on early Florida penal contract labor, please compare records.',
          tags: JSON.stringify(['PutnamCounty', 'ChainGang', 'Archival']),
          pinned: false
        },
        {
          category: 'records',
          content: 'Tip for new researchers: When cross-referencing prison record numbers with state archive microfilm reels, always verify the inmate admission date against the county commitment docket. Counties often held men for months before delivery to Raiford.',
          tags: JSON.stringify(['ResearchTips', 'Raiford', 'CourtDockets']),
          pinned: false
        },
        {
          category: 'mutual_aid',
          content: 'Family Assistance Circle: If you are trying to locate records for a family member incarcerated between 1950-1980 in the Florida system, reply here or submit through the Research Help Finder so we can help pull the archival microfilm.',
          tags: JSON.stringify(['MutualAid', 'FamilyRecords', 'Support']),
          pinned: false
        }
      ];

      for (const s of seeds) {
        await database.query(
          'INSERT INTO community_posts (author_id, category, content, tags, pinned, status) VALUES ($1, $2, $3, $4, $5, $6)',
          [authorId, s.category, s.content, s.tags, s.pinned, 'published']
        );
      }
    } catch (e) {
      console.warn('Community seed warning:', e.message);
    }
  }

  async function listPosts(request, response, requestUrl) {
    const database = db();
    if (!database) return json(response, 503, { error: 'Community database unavailable.' });
    await ensure();

    const currentUser = await getUser(request);
    const category = requestUrl.searchParams.get('category');
    const search = (requestUrl.searchParams.get('search') || '').trim();
    const limit = Math.min(Math.max(parseInt(requestUrl.searchParams.get('limit')) || 30, 1), 100);

    const conditions = ["p.status = 'published'"];
    const params = [];

    if (category && category !== 'all') {
      params.push(category);
      conditions.push(`p.category = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(p.content ILIKE $${params.length} OR p.tags::text ILIKE $${params.length})`);
    }

    const feedScope = requestUrl.searchParams.get('feed');
    if (currentUser && feedScope !== 'all') {
      params.push(currentUser.id);
      const uidParam = `$${params.length}`;
      conditions.push(`(
        p.pinned = true
        OR u.email LIKE '%@carceralcollections.internal'
        OR u.role = 'bot'
        OR p.author_id = ${uidParam}
        OR p.author_id IN (SELECT following_id FROM community_follows WHERE follower_id = ${uidParam})
        OR p.author_id IN (
          SELECT requester_id FROM community_connections WHERE receiver_id = ${uidParam} AND status = 'accepted'
          UNION
          SELECT receiver_id FROM community_connections WHERE requester_id = ${uidParam} AND status = 'accepted'
        )
      )`);
    }

    const whereClause = conditions.join(' AND ');
    params.push(limit);
    const limitParamIndex = params.length;

    let userReactedCol = 'false AS user_reacted';
    if (currentUser) {
      params.push(currentUser.id);
      userReactedCol = `EXISTS(SELECT 1 FROM community_post_reactions WHERE post_id = p.id AND user_id = $${params.length}) AS user_reacted`;
    }

    const query = `
      SELECT
        p.id,
        p.author_id,
        p.category,
        p.content,
        p.tags,
        p.pinned,
        p.media_url,
        p.created_at,
        p.updated_at,
        u.display_name,
        u.username,
        u.role,
        u.avatar_updated_at,
        COALESCE(r.rx_count, 0)::int AS reactions_count,
        COALESCE(c.cm_count, 0)::int AS comments_count,
        ${userReactedCol}
      FROM community_posts p
      JOIN community_users u ON u.id = p.author_id
      LEFT JOIN (
        SELECT post_id, COUNT(*) AS rx_count
        FROM community_post_reactions
        GROUP BY post_id
      ) r ON r.post_id = p.id
      LEFT JOIN (
        SELECT post_id, COUNT(*) AS cm_count
        FROM community_post_comments
        WHERE status = 'published'
        GROUP BY post_id
      ) c ON c.post_id = p.id
      WHERE ${whereClause}
      ORDER BY p.pinned DESC, p.created_at DESC
      LIMIT $${limitParamIndex}
    `;

    const result = await database.query(query, params);

    const postIds = result.rows.map(r => r.id);
    let commentsByPost = {};
    if (postIds.length > 0) {
      const commentRes = await database.query(`
        SELECT
          c.id,
          c.post_id,
          c.author_id,
          c.content,
          c.created_at,
          u.display_name,
          u.role,
          u.avatar_updated_at
        FROM community_post_comments c
        JOIN community_users u ON u.id = c.author_id
        WHERE c.post_id = ANY($1::uuid[]) AND c.status = 'published'
        ORDER BY c.created_at ASC
      `, [postIds]);

      for (const cm of commentRes.rows) {
        if (!commentsByPost[cm.post_id]) commentsByPost[cm.post_id] = [];
        commentsByPost[cm.post_id].push({
          id: cm.id,
          content: cm.content,
          createdAt: cm.created_at,
          author: {
            id: cm.author_id,
            displayName: cm.display_name,
            role: cm.role,
            initials: (cm.display_name || 'CC').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase(),
            hasAvatar: Boolean(cm.avatar_updated_at),
            avatarUpdatedAt: cm.avatar_updated_at || null,
            avatarUrl: cm.avatar_updated_at ? `/api/auth/avatar/${cm.author_id}?v=${encodeURIComponent(cm.avatar_updated_at)}` : null
          }
        });
      }
    }

    const posts = result.rows.map(row => ({
      id: row.id,
      category: row.category,
      content: row.content,
      tags: row.tags,
      pinned: row.pinned,
      mediaUrl: row.media_url || null,
      createdAt: row.created_at,
      reactionsCount: row.reactions_count,
      commentsCount: row.comments_count,
      userReacted: Boolean(row.user_reacted),
      author: {
        id: row.author_id,
        displayName: row.display_name,
        username: row.username,
        role: row.role,
        initials: (row.display_name || 'CC').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase(),
        hasAvatar: Boolean(row.avatar_updated_at),
        avatarUpdatedAt: row.avatar_updated_at || null,
        avatarUrl: row.avatar_updated_at ? `/api/auth/avatar/${row.author_id}?v=${encodeURIComponent(row.avatar_updated_at)}` : null
      },
      comments: commentsByPost[row.id] || []
    }));

    return json(response, 200, { posts, count: posts.length });
  }

  async function createPost(request, response) {
    const database = db();
    if (!database) return json(response, 503, { error: 'Community database unavailable.' });
    await ensure();

    const currentUser = await getUser(request);
    if (!currentUser) return json(response, 401, { error: 'Sign in is required to post in The Yard.' });

    if (rate && !await rate(request, 'community_post', 20, 3600)) {
      return json(response, 429, { error: 'Please wait before posting again.' });
    }

    const body = await parseBody(request, 16384);
    const content = String(body?.content || '').trim();
    const category = String(body?.category || 'general').trim().toLowerCase();
    const mediaUrl = body?.mediaUrl || body?.media_url ? String(body.mediaUrl || body.media_url).trim() : null;
    const validCategories = ['general', 'investigation', 'records', 'mutual_aid', 'cases', 'watch'];

    if (!content || content.length < 2 || content.length > 5000) {
      return json(response, 400, { error: 'Post content must be between 2 and 5,000 characters.' });
    }

    if (!validCategories.includes(category)) {
      return json(response, 400, { error: 'Invalid discussion category selected.' });
    }

    const tags = Array.isArray(body?.tags) ? body.tags.slice(0, 5).map(t => String(t).trim().replace(/^#/, '')).filter(Boolean) : [];

    const insertRes = await database.query(`
      INSERT INTO community_posts (author_id, category, content, tags, media_url, pinned, status)
      VALUES ($1, $2, $3, $4, $5, false, 'published')
      RETURNING id, created_at, updated_at
    `, [currentUser.id, category, content, JSON.stringify(tags), mediaUrl]);

    const post = {
      id: insertRes.rows[0].id,
      category,
      content,
      tags,
      pinned: false,
      mediaUrl,
      createdAt: insertRes.rows[0].created_at,
      reactionsCount: 0,
      commentsCount: 0,
      userReacted: false,
      author: {
        id: currentUser.id,
        displayName: currentUser.displayName,
        role: currentUser.role,
        initials: (currentUser.displayName || 'CC').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase(),
        hasAvatar: Boolean(currentUser.avatarUpdatedAt)
      },
      comments: []
    };

    return json(response, 201, { post, message: 'Discussion posted to The Yard.' });
  }

  async function toggleReaction(request, response, postId) {
    const database = db();
    if (!database) return json(response, 503, { error: 'Community database unavailable.' });
    await ensure();

    const currentUser = await getUser(request);
    if (!currentUser) return json(response, 401, { error: 'Sign in is required to react.' });

    const postCheck = await database.query('SELECT id FROM community_posts WHERE id = $1 AND status = $2', [postId, 'published']);
    if (!postCheck.rows.length) return json(response, 404, { error: 'Post not found.' });

    const existing = await database.query(
      'SELECT 1 FROM community_post_reactions WHERE post_id = $1 AND user_id = $2',
      [postId, currentUser.id]
    );

    let userReacted = false;
    if (existing.rows.length > 0) {
      await database.query('DELETE FROM community_post_reactions WHERE post_id = $1 AND user_id = $2', [postId, currentUser.id]);
      userReacted = false;
    } else {
      await database.query('INSERT INTO community_post_reactions (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [postId, currentUser.id]);
      userReacted = true;
    }

    const countRes = await database.query('SELECT count(*)::int AS count FROM community_post_reactions WHERE post_id = $1', [postId]);
    const count = countRes.rows[0]?.count || 0;

    return json(response, 200, { success: true, userReacted, count });
  }

  async function addComment(request, response, postId) {
    const database = db();
    if (!database) return json(response, 503, { error: 'Community database unavailable.' });
    await ensure();

    const currentUser = await getUser(request);
    if (!currentUser) return json(response, 401, { error: 'Sign in is required to comment.' });

    if (rate && !await rate(request, 'community_comment', 30, 3600)) {
      return json(response, 429, { error: 'Please wait before replying again.' });
    }

    const postCheck = await database.query('SELECT id FROM community_posts WHERE id = $1 AND status = $2', [postId, 'published']);
    if (!postCheck.rows.length) return json(response, 404, { error: 'Post not found.' });

    const body = await parseBody(request, 4096);
    const content = String(body?.content || '').trim();
    if (!content || content.length < 1 || content.length > 1500) {
      return json(response, 400, { error: 'Comment must be between 1 and 1,500 characters.' });
    }

    const insertRes = await database.query(`
      INSERT INTO community_post_comments (post_id, author_id, content, status)
      VALUES ($1, $2, $3, 'published')
      RETURNING id, created_at
    `, [postId, currentUser.id, content]);

    const countRes = await database.query('SELECT count(*)::int AS count FROM community_post_comments WHERE post_id = $1 AND status = $2', [postId, 'published']);

    const comment = {
      id: insertRes.rows[0].id,
      content,
      createdAt: insertRes.rows[0].created_at,
      author: {
        id: currentUser.id,
        displayName: currentUser.displayName,
        role: currentUser.role,
        initials: (currentUser.displayName || 'CC').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase(),
        hasAvatar: Boolean(currentUser.avatarUpdatedAt),
        avatarUpdatedAt: currentUser.avatarUpdatedAt || null,
        avatarUrl: currentUser.avatarUpdatedAt ? `/api/auth/avatar/${currentUser.id}?v=${encodeURIComponent(currentUser.avatarUpdatedAt)}` : null
      }
    };

    return json(response, 201, { comment, commentsCount: countRes.rows[0]?.count || 0 });
  }

  async function getProfileStats(request, response, requestUrl) {
    const database = db();
    if (!database) return json(response, 503, { error: 'Community database unavailable.' });
    await ensure();

    const currentUser = await getUser(request);
    const requestedUserId = requestUrl.searchParams.get('userId') || (currentUser ? currentUser.id : null);

    if (!requestedUserId) {
      return json(response, 200, {
        connections: 0,
        followers: 0,
        posts: 0
      });
    }

    try {
      const postRes = await database.query(
        "SELECT count(*)::int AS count FROM community_posts WHERE author_id = $1 AND status = 'published'",
        [requestedUserId]
      );
      const postCount = postRes.rows[0]?.count || 0;

      const followerRes = await database.query(
        "SELECT count(*)::int AS count FROM community_follows WHERE following_id = $1",
        [requestedUserId]
      );
      const followerCount = followerRes.rows[0]?.count || 0;

      const connRes = await database.query(`
        SELECT count(*)::int AS count
        FROM community_connections
        WHERE (requester_id = $1 OR receiver_id = $1) AND status = 'accepted'
      `, [requestedUserId]);
      const connectionCount = connRes.rows[0]?.count || 0;

      return json(response, 200, {
        connections: connectionCount,
        followers: followerCount,
        posts: postCount
      });
    } catch (err) {
      console.warn('Profile stats query warning:', err.message);
      return json(response, 200, { connections: 0, followers: 0, posts: 0 });
    }
  }

  async function toggleFollow(request, response, targetUserId) {
    const database = db();
    if (!database) return json(response, 503, { error: 'Community database unavailable.' });
    await ensure();

    const currentUser = await getUser(request);
    if (!currentUser) return json(response, 401, { error: 'Sign in is required to follow members.' });
    if (currentUser.id === targetUserId) return json(response, 400, { error: 'You cannot follow yourself.' });

    const existing = await database.query(
      'SELECT 1 FROM community_follows WHERE follower_id = $1 AND following_id = $2',
      [currentUser.id, targetUserId]
    );

    let following = false;
    if (existing.rows.length > 0) {
      await database.query(
        'DELETE FROM community_follows WHERE follower_id = $1 AND following_id = $2',
        [currentUser.id, targetUserId]
      );
      following = false;
    } else {
      await database.query(
        'INSERT INTO community_follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [currentUser.id, targetUserId]
      );
      following = true;
    }

    const countRes = await database.query(
      'SELECT count(*)::int AS count FROM community_follows WHERE following_id = $1',
      [targetUserId]
    );

    return json(response, 200, {
      success: true,
      following,
      followersCount: countRes.rows[0]?.count || 0
    });
  }

  async function toggleConnect(request, response, targetUserId) {
    const database = db();
    if (!database) return json(response, 503, { error: 'Community database unavailable.' });
    await ensure();

    const currentUser = await getUser(request);
    if (!currentUser) return json(response, 401, { error: 'Sign in is required to connect with members.' });
    if (currentUser.id === targetUserId) return json(response, 400, { error: 'You cannot connect with yourself.' });

    const targetUserRes = await database.query(
      'SELECT id, display_name, email FROM community_users WHERE id = $1',
      [targetUserId]
    );
    if (!targetUserRes.rows.length) return json(response, 404, { error: 'Member not found.' });

    const targetUser = targetUserRes.rows[0];
    const isBot = String(targetUser.email || '').endsWith('@carceralcollections.internal');

    const body = await parseBody(request).catch(() => ({}));
    const explicitAction = String(body?.action || '').toLowerCase(); // 'unconnect' | 'cancel' | 'connect'

    const existing = await database.query(
      'SELECT id, requester_id, receiver_id, status FROM community_connections WHERE (requester_id = $1 AND receiver_id = $2) OR (requester_id = $2 AND receiver_id = $1)',
      [currentUser.id, targetUserId]
    );

    let connectionStatus = 'none';

    if (explicitAction === 'unconnect') {
      await database.query(
        'DELETE FROM community_connections WHERE (requester_id = $1 AND receiver_id = $2) OR (requester_id = $2 AND receiver_id = $1)',
        [currentUser.id, targetUserId]
      );
      connectionStatus = 'none';
    } else if (explicitAction === 'cancel') {
      await database.query(
        'DELETE FROM community_connections WHERE requester_id = $1 AND receiver_id = $2 AND status = $3',
        [currentUser.id, targetUserId, 'pending']
      );
      connectionStatus = 'none';
    } else if (existing.rows.length > 0) {
      const conn = existing.rows[0];
      // If the other user already sent a pending request to currentUser, clicking Connect automatically accepts!
      if (conn.status === 'pending' && conn.receiver_id === currentUser.id) {
        await database.query("UPDATE community_connections SET status = 'accepted', updated_at = now() WHERE id = $1", [conn.id]);
        connectionStatus = 'accepted';
      } else {
        // Toggle off / unconnect
        await database.query('DELETE FROM community_connections WHERE id = $1', [conn.id]);
        connectionStatus = 'none';
      }
    } else {
      const initialStatus = isBot ? 'accepted' : 'pending';
      await database.query(`
        INSERT INTO community_connections (requester_id, receiver_id, status)
        VALUES ($1, $2, $3)
      `, [currentUser.id, targetUserId, initialStatus]);
      connectionStatus = initialStatus;
    }

    const connRes = await database.query(`
      SELECT count(*)::int AS count
      FROM community_connections
      WHERE (requester_id = $1 OR receiver_id = $1) AND status = 'accepted'
    `, [currentUser.id]);

    return json(response, 200, {
      success: true,
      status: connectionStatus,
      isConnected: connectionStatus === 'accepted',
      isPending: connectionStatus === 'pending',
      connectionsCount: connRes.rows[0]?.count || 0
    });
  }

  async function respondConnection(request, response, connectionId) {
    const database = db();
    if (!database) return json(response, 503, { error: 'Community database unavailable.' });
    await ensure();

    const currentUser = await getUser(request);
    if (!currentUser) return json(response, 401, { error: 'Sign in is required.' });

    const body = await parseBody(request);
    const action = String(body.action || '').toLowerCase(); // 'accept' | 'decline' | 'deny'

    const connRes = await database.query(
      'SELECT id, requester_id, receiver_id, status FROM community_connections WHERE id = $1',
      [connectionId]
    );
    if (!connRes.rows.length) return json(response, 404, { error: 'Connection request not found.' });

    const conn = connRes.rows[0];
    if (conn.receiver_id !== currentUser.id) {
      return json(response, 403, { error: 'Not authorized to respond to this connection request.' });
    }

    if (action === 'accept') {
      await database.query(
        "UPDATE community_connections SET status = 'accepted', updated_at = now() WHERE id = $1",
        [conn.id]
      );
    } else {
      // Clean deny / decline
      await database.query(
        "DELETE FROM community_connections WHERE id = $1",
        [conn.id]
      );
    }

    const countRes = await database.query(`
      SELECT count(*)::int AS count
      FROM community_connections
      WHERE (requester_id = $1 OR receiver_id = $1) AND status = 'accepted'
    `, [currentUser.id]);

    return json(response, 200, {
      success: true,
      status: action === 'accept' ? 'accepted' : 'declined',
      connectionsCount: countRes.rows[0]?.count || 0
    });
  }

  async function listMembersData(request) {
    const database = db();
    const currentUser = await getUser(request);

    let currentUserProfile = null;
    if (currentUser) {
      const uRes = await database.query(
        'SELECT id, display_name, role, profile_about, profile_now, profile_interests, profile_location FROM community_users WHERE id = $1',
        [currentUser.id]
      );
      currentUserProfile = uRes.rows[0] || null;
    }

    // 1. Fetch active users
    const membersRes = await database.query(`
      SELECT id, display_name, username, role, profile_about, profile_now, profile_interests, profile_location, avatar_updated_at, email
      FROM community_users
      WHERE status = 'active'
      ORDER BY role = 'owner' DESC, created_at ASC
    `);

    // 2. Fetch network graph for Meta-style affinity
    const allConnsRes = await database.query("SELECT requester_id, receiver_id FROM community_connections WHERE status = 'accepted'");
    const connectionsByUser = new Map();
    for (const r of allConnsRes.rows) {
      if (!connectionsByUser.has(r.requester_id)) connectionsByUser.set(r.requester_id, new Set());
      if (!connectionsByUser.has(r.receiver_id)) connectionsByUser.set(r.receiver_id, new Set());
      connectionsByUser.get(r.requester_id).add(r.receiver_id);
      connectionsByUser.get(r.receiver_id).add(r.requester_id);
    }

    const postTagsRes = await database.query("SELECT author_id, tags FROM community_posts WHERE status = 'published'");
    const userPostTags = new Map();
    for (const r of postTagsRes.rows) {
      let tags = [];
      try { tags = typeof r.tags === 'string' ? JSON.parse(r.tags) : (Array.isArray(r.tags) ? r.tags : []); } catch (_) {}
      if (!userPostTags.has(r.author_id)) userPostTags.set(r.author_id, []);
      userPostTags.get(r.author_id).push(...tags.map(t => String(t).toLowerCase()));
    }

    const interactionsRes = await database.query(`
      SELECT p.author_id AS post_author, c.author_id AS comment_author, COUNT(*)::int AS cnt
      FROM community_post_comments c
      JOIN community_posts p ON p.id = c.post_id
      WHERE c.author_id != p.author_id
      GROUP BY p.author_id, c.author_id
    `);
    const interactionsBetween = new Map();
    for (const r of interactionsRes.rows) {
      interactionsBetween.set(`${r.post_author}:${r.comment_author}`, r.cnt);
      interactionsBetween.set(`${r.comment_author}:${r.post_author}`, r.cnt);
    }

    const networkData = { connectionsByUser, userPostTags, interactionsBetween };

    let followingIds = new Set();
    let connectedIds = new Set();
    let pendingSentIds = new Set();
    let pendingReceivedMap = new Map();

    if (currentUser) {
      const followsRes = await database.query(
        'SELECT following_id FROM community_follows WHERE follower_id = $1',
        [currentUser.id]
      );
      followsRes.rows.forEach(r => followingIds.add(r.following_id));

      const connsRes = await database.query(`
        SELECT id, requester_id, receiver_id, status
        FROM community_connections
        WHERE (requester_id = $1 OR receiver_id = $1)
      `, [currentUser.id]);

      connsRes.rows.forEach(r => {
        if (r.status === 'accepted') {
          const otherId = r.requester_id === currentUser.id ? r.receiver_id : r.requester_id;
          connectedIds.add(otherId);
        } else if (r.status === 'pending') {
          if (r.requester_id === currentUser.id) {
            pendingSentIds.add(r.receiver_id);
          } else {
            pendingReceivedMap.set(r.requester_id, r.id);
          }
        }
      });
    }

    const members = membersRes.rows
      .filter(m => !currentUser || m.id !== currentUser.id)
      .map(m => {
        const affinity = computeMetaAffinity(currentUserProfile, m, networkData);
        return {
          id: m.id,
          displayName: m.display_name,
          username: m.username,
          role: m.role,
          about: m.profile_about,
          location: m.profile_location,
          initials: (m.display_name || 'CC').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase(),
          hasAvatar: Boolean(m.avatar_updated_at),
          avatarUpdatedAt: m.avatar_updated_at || null,
          avatarUrl: m.avatar_updated_at ? `/api/auth/avatar/${m.id}?v=${encodeURIComponent(m.avatar_updated_at)}` : null,
          isFollowing: followingIds.has(m.id),
          isConnected: connectedIds.has(m.id),
          isPending: pendingSentIds.has(m.id),
          isPendingReceived: pendingReceivedMap.has(m.id),
          pendingConnectionId: pendingReceivedMap.get(m.id) || null,
          matchScore: affinity.matchScore,
          matchReason: affinity.matchReason
        };
      })
      .sort((a, b) => {
        if (a.isPendingReceived && !b.isPendingReceived) return -1;
        if (!a.isPendingReceived && b.isPendingReceived) return 1;
        return (b.matchScore || 0) - (a.matchScore || 0);
      });

    return { members };
  }

  async function listMembers(request, response) {
    const database = db();
    if (!database) return json(response, 503, { error: 'Community database unavailable.' });
    await ensure();
    const data = await listMembersData(request);
    return json(response, 200, data);
  }

  async function getRecommendations(request, response) {
    const database = db();
    if (!database) return json(response, 503, { error: 'Community database unavailable.' });
    await ensure();
    const data = await listMembersData(request);
    const recommendations = (data.members || [])
      .filter(m => !m.isConnected && !m.isPending && !m.isPendingReceived)
      .slice(0, 10);
    return json(response, 200, { recommendations });
  }

  async function getInbox(request, response) {
    const database = db();
    if (!database) return json(response, 503, { error: 'Community database unavailable.' });
    await ensure();

    const currentUser = await getUser(request);
    if (!currentUser) {
      return json(response, 200, {
        unreadCount: 0,
        connectionRequests: [],
        messages: []
      });
    }

    // 1. Pending connection requests received by current user
    const pendingConnsRes = await database.query(`
      SELECT c.id, c.requester_id, c.created_at, u.display_name, u.username, u.role, u.profile_location, u.avatar_updated_at
      FROM community_connections c
      JOIN community_users u ON u.id = c.requester_id
      WHERE c.receiver_id = $1 AND c.status = 'pending'
      ORDER BY c.created_at DESC
    `, [currentUser.id]);

    const connectionRequests = pendingConnsRes.rows.map(r => ({
      id: r.id,
      requesterId: r.requester_id,
      displayName: r.display_name,
      username: r.username,
      role: r.role,
      location: r.profile_location,
      initials: (r.display_name || 'CC').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase(),
      hasAvatar: Boolean(r.avatar_updated_at),
      avatarUpdatedAt: r.avatar_updated_at || null,
      avatarUrl: r.avatar_updated_at ? `/api/auth/avatar/${r.requester_id}?v=${encodeURIComponent(r.avatar_updated_at)}` : null,
      createdAt: r.created_at
    }));

    // 2. Direct messages received by current user
    const msgsRes = await database.query(`
      SELECT m.id, m.sender_id, m.subject, m.content, m.read, m.created_at,
             u.display_name AS sender_name, u.username AS sender_username, u.role AS sender_role, u.avatar_updated_at AS sender_avatar_updated_at
      FROM community_messages m
      LEFT JOIN community_users u ON u.id = m.sender_id
      WHERE m.recipient_id = $1
      ORDER BY m.created_at DESC
    `, [currentUser.id]);

    let messages = msgsRes.rows.map(m => ({
      id: m.id,
      senderId: m.sender_id,
      senderName: m.sender_name || 'The Yard Team',
      senderInitials: (m.sender_name || 'YT').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase(),
      senderRole: m.sender_role || 'archivist',
      senderHasAvatar: Boolean(m.sender_avatar_updated_at),
      senderAvatarUpdatedAt: m.sender_avatar_updated_at || null,
      senderAvatarUrl: m.sender_avatar_updated_at ? `/api/auth/avatar/${m.sender_id}?v=${encodeURIComponent(m.sender_avatar_updated_at)}` : null,
      subject: m.subject || 'Community Message',
      content: m.content,
      read: m.read,
      createdAt: m.created_at
    }));

    // Synthesize official Welcome Message if no custom messages yet
    if (messages.length === 0) {
      const welcomeContent = `Welcome to The Yard, ${currentUser.displayName || 'Researcher'}!

“The official record never tells the whole story.”

State ledgers, institutional reports, and administrative files often reflect the priorities of the agencies that created them. They can leave out abuse, conflict, resistance, family testimony, and the experiences of people whose lives were reduced to a line in a ledger.

The Yard brings families, historians, researchers, and advocates together to question those records, compare them against other evidence, recover missing voices, and examine what the official version may have overlooked, minimized, or left unexplained.

How to get started:
• 🏠 The Feed: Share grassroots discoveries, legal filings, and mutual aid updates.
• 🚨 What’s Breaking: Track live incident alerts and emerging docket updates.
• ⚖️ Cases Everybody’s Watching: In-depth dossiers on Lil Durk, Tupac/Keffe D, Luigi Mangione, Diddy, Rap on Trial, and the Chicago drill matrix.
• 🤝 Connect with fellow verified members and exchange direct inquiries.

Welcome to the collective archive.`;

      messages = [
        {
          id: 'msg-welcome',
          senderId: null,
          senderName: 'The Yard Team',
          senderInitials: 'YT',
          senderRole: 'archivist',
          subject: `Welcome to The Yard, ${currentUser.displayName || 'Member'}!`,
          content: welcomeContent,
          read: false,
          createdAt: new Date().toISOString()
        }
      ];
    }

    const unreadMessagesCount = messages.filter(m => !m.read).length;
    const unreadCount = unreadMessagesCount + connectionRequests.length;

    return json(response, 200, {
      unreadCount,
      connectionRequests,
      messages
    });
  }

  async function sendMessage(request, response) {
    const database = db();
    if (!database) return json(response, 503, { error: 'Community database unavailable.' });
    await ensure();

    const currentUser = await getUser(request);
    if (!currentUser) return json(response, 401, { error: 'Sign in is required to send messages.' });

    const body = await parseBody(request);
    const recipientId = body.recipientId;
    const subject = String(body.subject || '').trim().slice(0, 150);
    const content = String(body.content || '').trim();

    if (!recipientId) return json(response, 400, { error: 'Recipient is required.' });
    if (!content) return json(response, 400, { error: 'Message content cannot be empty.' });
    if (recipientId === currentUser.id) return json(response, 400, { error: 'Cannot send messages to yourself.' });

    const recRes = await database.query('SELECT id, display_name FROM community_users WHERE id = $1', [recipientId]);
    if (!recRes.rows.length) return json(response, 404, { error: 'Recipient not found.' });

    const insertRes = await database.query(`
      INSERT INTO community_messages (sender_id, recipient_id, subject, content)
      VALUES ($1, $2, $3, $4)
      RETURNING id, sender_id, recipient_id, subject, content, read, created_at
    `, [currentUser.id, recipientId, subject || 'Direct Message', content]);

    return json(response, 201, {
      success: true,
      message: insertRes.rows[0]
    });
  }

  async function markMessageRead(request, response, messageId) {
    const database = db();
    if (!database) return json(response, 503, { error: 'Community database unavailable.' });
    await ensure();

    const currentUser = await getUser(request);
    if (!currentUser) return json(response, 401, { error: 'Sign in is required.' });

    if (messageId !== 'msg-welcome') {
      await database.query(
        'UPDATE community_messages SET read = true WHERE id = $1 AND recipient_id = $2',
        [messageId, currentUser.id]
      );
    }

    return json(response, 200, { success: true });
  }

  async function getCases(request, response) {
    const filePath = path.join(__dirname, '../data/cases-watching.json');
    if (!fs.existsSync(filePath)) {
      return json(response, 404, { error: 'Cases dossier unavailable.' });
    }
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return json(response, 200, data);
    } catch (err) {
      return json(response, 500, { error: 'Failed to read cases data.' });
    }
  }

  async function handle(request, response, requestUrl) {
    const pathname = requestUrl.pathname;
    const method = request.method;

    if (method === 'GET' && pathname === '/api/community/posts') {
      return listPosts(request, response, requestUrl);
    }
    if (method === 'POST' && pathname === '/api/community/posts') {
      return createPost(request, response);
    }
    if (method === 'GET' && pathname === '/api/community/profile/stats') {
      return getProfileStats(request, response, requestUrl);
    }
    if (method === 'GET' && pathname === '/api/community/cases') {
      return getCases(request, response);
    }
    if (method === 'GET' && pathname === '/api/community/recommendations') {
      return getRecommendations(request, response);
    }
    if (method === 'GET' && pathname === '/api/community/members') {
      return listMembers(request, response);
    }
    if (method === 'GET' && pathname === '/api/community/inbox') {
      return getInbox(request, response);
    }
    if (method === 'POST' && pathname === '/api/community/messages') {
      return sendMessage(request, response);
    }

    const connRespondMatch = pathname.match(/^\/api\/community\/connections\/([0-9a-f-]{36})\/respond$/i);
    if (method === 'POST' && connRespondMatch) {
      return respondConnection(request, response, connRespondMatch[1]);
    }

    const msgReadMatch = pathname.match(/^\/api\/community\/messages\/([0-9a-f-]+)\/read$/i);
    if (method === 'POST' && msgReadMatch) {
      return markMessageRead(request, response, msgReadMatch[1]);
    }

    const followMatch = pathname.match(/^\/api\/community\/users\/([0-9a-f-]{36})\/follow$/i);
    if (method === 'POST' && followMatch) {
      return toggleFollow(request, response, followMatch[1]);
    }

    const unconnectMatch = pathname.match(/^\/api\/community\/users\/([0-9a-f-]{36})\/unconnect$/i);
    if (method === 'POST' && unconnectMatch) {
      return toggleConnect(request, response, unconnectMatch[1]);
    }

    const connectMatch = pathname.match(/^\/api\/community\/users\/([0-9a-f-]{36})\/connect$/i);
    if (method === 'POST' && connectMatch) {
      return toggleConnect(request, response, connectMatch[1]);
    }

    const reactMatch = pathname.match(/^\/api\/community\/posts\/([0-9a-f-]{36})\/react$/i);
    if (method === 'POST' && reactMatch) {
      return toggleReaction(request, response, reactMatch[1]);
    }

    const commentMatch = pathname.match(/^\/api\/community\/posts\/([0-9a-f-]{36})\/comments$/i);
    if (method === 'POST' && commentMatch) {
      return addComment(request, response, commentMatch[1]);
    }

    return json(response, 404, { error: 'Not found' });
  }

  return {
    ensure,
    handle,
    listPosts,
    createPost,
    toggleReaction,
    addComment,
    getProfileStats,
    toggleFollow,
    toggleConnect,
    respondConnection,
    listMembers,
    getRecommendations,
    getInbox,
    sendMessage,
    markMessageRead,
    getCases
  };
}

module.exports = { createCommunityHubService, computeMetaAffinity };
