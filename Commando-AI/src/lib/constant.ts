import Category from '@/components/icons/category'
import Logs from '@/components/icons/clipboard'
import Templates from '@/components/icons/cloud_download'
import Home from '@/components/icons/home'
import Payment from '@/components/icons/payment'
import Settings from '@/components/icons/settings'
import Workflows from '@/components/icons/workflows'
import Projects from '@/components/icons/projects'
import { Connection } from './types'
import { LucideMousePointerClick } from 'lucide-react'

export const clients = [...new Array(10)].map((client, index) => ({
  href: `/${index + 1}.png`,
}))

export const products = [
  {
    title: 'Moonbeam',
    link: 'https://gomoonbeam.com',
    thumbnail: '/p1.png',
  },
  {
    title: 'Cursor',
    link: 'https://cursor.so',
    thumbnail: '/p2.png',
  },
  {
    title: 'Rogue',
    link: 'https://userogue.com',
    thumbnail: '/p3.png',
  },

  {
    title: 'Editorially',
    link: 'https://editorially.org',
    thumbnail: '/p4.png',
  },
  {
    title: 'Editrix AI',
    link: 'https://editrix.ai',
    thumbnail: '/p5.png',
  },
  {
    title: 'Pixel Perfect',
    link: 'https://app.pixelperfect.quest',
    thumbnail: '/p6.png',
  },

  {
    title: 'Algochurn',
    link: 'https://algochurn.com',
    thumbnail: '/p1.png',
  },
  {
    title: 'Aceternity UI',
    link: 'https://ui.aceternity.com',
    thumbnail: '/p2.png',
  },
  {
    title: 'Tailwind Master Kit',
    link: 'https://tailwindmasterkit.com',
    thumbnail: '/p3.png',
  },
  {
    title: 'SmartBridge',
    link: 'https://smartbridgetech.com',
    thumbnail: '/p4.png',
  },
  {
    title: 'Renderwork Studio',
    link: 'https://renderwork.studio',
    thumbnail: '/p5.png',
  },

  {
    title: 'Creme Digital',
    link: 'https://cremedigital.com',
    thumbnail: '/p6.png',
  },
  {
    title: 'Golden Bells Academy',
    link: 'https://goldenbellsacademy.com',
    thumbnail: '/p1.png',
  },
  {
    title: 'Invoker Labs',
    link: 'https://invoker.lol',
    thumbnail: '/p2.png',
  },
  {
    title: 'E Free Invoice',
    link: 'https://efreeinvoice.com',
    thumbnail: '/p3.png',
  },
]

export const menuOptions = [
  { name: 'Dashboard', Component: Home, href: '/dashboard' },
  { name: 'Workflows', Component: Workflows, href: '/workflows' },
  { name: 'Projects', Component: Projects, href: '/projects' },
  { name: 'Settings', Component: Settings, href: '/settings' },
  { name: 'Connections', Component: Category, href: '/connections' },
  { name: 'Billing', Component: Payment, href: '/billing' },
  {name:"Meet",Component:LucideMousePointerClick,href:"/dashboard/meet-home"},
]

export const EditorCanvasDefaultCardTypes = {
  Email: { description: 'Send an email to a user', type: 'Action' },
  Condition: {
    description: 'Boolean operator that creates different conditions lanes.',
    type: 'Action',
  },
  AI: {
    description:
      'Use Gemini AI to summarize, analyze, transform, and generate content.',
    type: 'Action',
  },
  Slack: { description: 'Send a notification to slack', type: 'Action' },
  'Google Drive': {
    description:
      'Connect with Google drive to trigger actions or to create files and folders.',
    type: 'Trigger',
  },
  Notion: { description: 'Create entries directly in notion.', type: 'Action' },
  'Custom Webhook': {
    description:
      'Connect any app that has an API key and send data to your application.',
    type: 'Action',
  },
  Discord: {
    description: 'Post messages to your discord server',
    type: 'Action',
  },
  'Google Calendar': {
    description: 'Create a calendar invite.',
    type: 'Action',
  },
  'Gmail Read': {
    description: 'Read emails from Gmail with filters (sender, subject, labels, date range).',
    type: 'Trigger',
  },
  'Gmail Send': {
    description: 'Send emails, create drafts, or reply to email threads.',
    type: 'Action',
  },
  Trigger: {
    description: 'An event that starts the workflow.',
    type: 'Trigger',
  },
  Action: {
    description: 'An event that happens after the workflow begins',
    type: 'Action',
  },
  Wait: {
    description: 'Delay the next action step by using the wait timer.',
    type: 'Action',
  },
  'HTTP Request': {
    description: 'Make API calls to any external service with full control.',
    type: 'Action',
  },
  'Schedule Trigger': {
    description: 'Run workflow on a schedule (hourly, daily, weekly, custom cron).',
    type: 'Trigger',
  },
  'Text Formatter': {
    description: 'Format, transform, and template text data between nodes.',
    type: 'Action',
  },
  'Data Filter': {
    description: 'Filter and transform JSON data arrays.',
    type: 'Action',
  },
  'Code': {
    description: 'Run custom JavaScript code for advanced transformations.',
    type: 'Action',
  },
}

export const CONNECTIONS: Connection[] = [
  {
    title: 'Google Drive',
    description: 'Connect your google drive to listen to folder changes',
    image: '/googleDrive.png',
    connectionKey: 'googleNode',
    alwaysTrue: true,
  },
  {
    title: 'Google Calendar',
    description: 'Create and manage calendar events in your workflows',
    image: '/icons/google-calendar.svg',
    connectionKey: 'googleCalendarNode',
    alwaysTrue: true,
  },
  {
    title: 'Gmail',
    description: 'Read, send, and automate emails from your Gmail account',
    image: '/icons/gmail.svg',
    connectionKey: 'gmailNode',
    alwaysTrue: true,
  },
  {
    title: 'Discord',
    description: 'Connect your discord to send notification and messages',
    image: '/discord.png',
    connectionKey: 'discordNode',
    accessTokenKey: 'webhookURL',
  },
  {
    title: 'Notion',
    description: 'Create entries in your notion dashboard and automate tasks.',
    image: '/notion.png',
    connectionKey: 'notionNode',
    accessTokenKey: 'accessToken',
  },
  {
    title: 'Slack',
    description:
      'Use slack to send notifications to team members through your own custom bot.',
    image: '/slack.png',
    connectionKey: 'slackNode',
    accessTokenKey: 'slackAccessToken',
    slackSpecial: true,
  },
]
