'use server'
import { Option } from '@/components/ui/multiple-selector'
import { db } from '@/lib/db'
import { auth, currentUser } from '@clerk/nextjs/server'

/**
 * Ensures the current Clerk user exists in our database.
 * Fallback for when Clerk webhook hasn't synced the user.
 */
const ensureUserInDb = async () => {
  const user = await currentUser()
  if (!user) return null

  const existingUser = await db.user.findUnique({
    where: { clerkId: user.id },
  })

  if (existingUser) return user

  // Use upsert to handle case where email already exists but clerkId doesn't match
  const email = user.emailAddresses?.[0]?.emailAddress || ''
  await db.user.upsert({
    where: { clerkId: user.id },
    update: {
      email: email,
      name: user.firstName || user.username || '',
      profileImage: user.imageUrl || '',
    },
    create: {
      clerkId: user.id,
      email: email,
      name: user.firstName || user.username || '',
      profileImage: user.imageUrl || '',
    },
  })
  
  console.log('Auto-created/updated user in database:', user.id)
  return user
}

export const getGoogleListener = async () => {
  const user = await currentUser() // ✅ Await the function

  if (!user) {
    return { message: 'User not found' }
  }

  const userId = user.id // ✅ Get user ID properly

  if (userId) {
    const listener = await db.user.findUnique({
      where: {
        clerkId: userId,
      },
      select: {
        googleResourceId: true,
      },
    })

    if (listener) return listener
  }
}

export const onFlowPublish = async (workflowId: string, state: boolean) => {
  console.log(state)
  const published = await db.workflows.update({
    where: {
      id: workflowId,
    },
    data: {
      publish: state,
    },
  })

  if (published.publish) return 'Workflow published'
  return 'Workflow unpublished'
}

export const onCreateNodeTemplate = async (
  content: string,
  type: string,
  workflowId: string,
  channels?: Option[],
  accessToken?: string,
  notionDbId?: string
) => {
  if (type === 'Discord') {
    const response = await db.workflows.update({
      where: {
        id: workflowId,
      },
      data: {
        discordTemplate: content,
      },
    })

    if (response) {
      return 'Discord template saved'
    }
  }
  if (type === 'Slack') {
    const response = await db.workflows.update({
      where: {
        id: workflowId,
      },
      data: {
        slackTemplate: content,
        slackAccessToken: accessToken,
      },
    })

    if (response) {
      const channelList = await db.workflows.findUnique({
        where: {
          id: workflowId,
        },
        select: {
          slackChannels: true,
        },
      })

      if (channelList) {
        //remove duplicates before insert
        const NonDuplicated = channelList.slackChannels.filter(
          (channel) => channel !== channels![0].value
        )

        NonDuplicated!
          .map((channel) => channel)
          .forEach(async (channel) => {
            await db.workflows.update({
              where: {
                id: workflowId,
              },
              data: {
                slackChannels: {
                  push: channel,
                },
              },
            })
          })

        return 'Slack template saved'
      }
      channels!
        .map((channel) => channel.value)
        .forEach(async (channel) => {
          await db.workflows.update({
            where: {
              id: workflowId,
            },
            data: {
              slackChannels: {
                push: channel,
              },
            },
          })
        })
      return 'Slack template saved'
    }
  }

  if (type === 'Notion') {
    const response = await db.workflows.update({
      where: {
        id: workflowId,
      },
      data: {
        notionTemplate: content,
        notionAccessToken: accessToken,
        notionDbId: notionDbId,
      },
    })

    if (response) return 'Notion template saved'
  }
}

export const onGetWorkflows = async () => {
  const user = await currentUser()
  if (user) {
    const workflow = await db.workflows.findMany({
      where: {
        userId: user.id,
      },
    })

    if (workflow) return workflow
  }
}

export const onCreateWorkflow = async (name: string, description: string) => {
  // Ensure user exists in DB before creating workflow
  const user = await ensureUserInDb()

  if (user) {
    try {
      //create new workflow
      const workflow = await db.workflows.create({
        data: {
          userId: user.id,
          name,
          description,
        },
      })

      if (workflow) return { message: 'workflow created' }
      return { message: 'Oops! try again' }
    } catch (error) {
      console.error('Error creating workflow:', error)
      return { message: 'Failed to create workflow. Please try again.' }
    }
  }
  
  return { message: 'User not authenticated' }
}

export const onGetNodesEdges = async (flowId: string) => {
  const nodesEdges = await db.workflows.findUnique({
    where: {
      id: flowId,
    },
    select: {
      nodes: true,
      edges: true,
    },
  })
  if (nodesEdges?.nodes && nodesEdges?.edges) return nodesEdges
}
