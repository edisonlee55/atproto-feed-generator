import {
  OutputSchema as RepoEvent,
  isCommit,
} from './lexicon/types/com/atproto/sync/subscribeRepos'
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription'

export class FirehoseSubscription extends FirehoseSubscriptionBase {
  async handleEvent(evt: RepoEvent) {
    if (!isCommit(evt)) return
    const ops = await getOpsByType(evt)

    // This logs the text of every post off the firehose.
    // Just for fun :)
    // Delete before actually using
    // for (const post of ops.posts.creates) {
    //   console.log(post.record.text)
    // }

    const postsToDelete = ops.posts.deletes.map((del) => del.uri)

    const illustHashtagPosts = ops.posts.creates
      .filter((create) => {
        // Filtering posts by hashtag
        let filterRes = create.record.text.toLowerCase().includes('#illust') || create.record.text.toLowerCase().includes('#illustration') || create.record.text.includes('#イラスト')
        return filterRes
      })
      .map((create) => {
        // Log filtered posts to console
        // console.log(create.record.text)

        // map filtered posts to a db row
        return {
          uri: create.uri,
          cid: create.cid,
          replyParent: create.record?.reply?.parent.uri ?? null,
          replyRoot: create.record?.reply?.root.uri ?? null,
          indexedAt: new Date().toISOString(),
          feedShortName: 'illust-hashtag'
        }
      })

    if (postsToDelete.length > 0) {
      await this.db
        .deleteFrom('post')
        .where('uri', 'in', postsToDelete)
        .execute()
    }

    if (illustHashtagPosts.length > 0) {
      await this.db
        .insertInto('post')
        .values(illustHashtagPosts)
        .onConflict((oc) => oc.doNothing())
        .execute()
    }
  }
}
