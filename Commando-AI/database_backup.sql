--
-- PostgreSQL database dump
--

-- Dumped from database version 16.11 (74c6bb6)
-- Dumped by pg_dump version 17.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Connections" (
    id text NOT NULL,
    type text NOT NULL,
    "discordWebhookId" text,
    "notionId" text,
    "userId" text,
    "slackId" text
);


--
-- Name: DiscordWebhook; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DiscordWebhook" (
    id text NOT NULL,
    "webhookId" text NOT NULL,
    url text NOT NULL,
    name text NOT NULL,
    "guildName" text NOT NULL,
    "guildId" text NOT NULL,
    "channelId" text NOT NULL,
    "userId" text NOT NULL
);


--
-- Name: LocalGoogleCredential; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LocalGoogleCredential" (
    id text NOT NULL,
    "accessToken" text NOT NULL,
    "folderId" text,
    "pageToken" text,
    "channelId" text NOT NULL,
    subscribed boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "userId" integer NOT NULL
);


--
-- Name: Notion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Notion" (
    id text NOT NULL,
    "accessToken" text NOT NULL,
    "workspaceId" text NOT NULL,
    "databaseId" text NOT NULL,
    "workspaceName" text NOT NULL,
    "workspaceIcon" text NOT NULL,
    "userId" text NOT NULL
);


--
-- Name: Slack; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Slack" (
    id text NOT NULL,
    "appId" text NOT NULL,
    "authedUserId" text NOT NULL,
    "authedUserToken" text NOT NULL,
    "slackAccessToken" text NOT NULL,
    "botUserId" text NOT NULL,
    "teamId" text NOT NULL,
    "teamName" text NOT NULL,
    "userId" text NOT NULL
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id integer NOT NULL,
    "clerkId" text NOT NULL,
    name text,
    email text NOT NULL,
    "profileImage" text,
    tier text DEFAULT 'Free'::text,
    credits text DEFAULT '10'::text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "localGoogleId" text,
    "googleResourceId" text
);


--
-- Name: User_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."User_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: User_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."User_id_seq" OWNED BY public."User".id;


--
-- Name: WorkflowExecution; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."WorkflowExecution" (
    id text NOT NULL,
    "workflowId" text NOT NULL,
    status text NOT NULL,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone,
    error text,
    "executionLogs" jsonb,
    "triggerType" text
);


--
-- Name: Workflows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Workflows" (
    id text NOT NULL,
    nodes text,
    edges text,
    name text NOT NULL,
    "discordTemplate" text,
    "notionTemplate" text,
    "slackTemplate" text,
    "slackChannels" text[],
    "slackAccessToken" text,
    "notionAccessToken" text,
    "notionDbId" text,
    "flowPath" text,
    "cronPath" text,
    publish boolean DEFAULT false,
    description text NOT NULL,
    "userId" text NOT NULL,
    "emailSubject" text,
    "emailTemplate" text,
    "emailTo" text
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: User id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User" ALTER COLUMN id SET DEFAULT nextval('public."User_id_seq"'::regclass);


--
-- Data for Name: Connections; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Connections" (id, type, "discordWebhookId", "notionId", "userId", "slackId") FROM stdin;
578c380e-2816-4b1a-93b7-2c8831404f98	Discord	18b67ea1-9b1c-4855-aa0d-e4358268e406	\N	user_37WoBjtLBxW0BCi7H3cBtJja6RV	\N
\.


--
-- Data for Name: DiscordWebhook; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DiscordWebhook" (id, "webhookId", url, name, "guildName", "guildId", "channelId", "userId") FROM stdin;
18b67ea1-9b1c-4855-aa0d-e4358268e406	1455275871609950414	https://discord.com/api/webhooks/1455275871609950414/Rh2RmIJdtR7aASFyDnWYk-VxUCEpm9jeMnbig79vuUIZjaIL9CP3AeMiJXwEwg2ztlg_	CommandoAI	CommandoAI's server	1342440317433024514	1342440318121021443	user_37WoBjtLBxW0BCi7H3cBtJja6RV
\.


--
-- Data for Name: LocalGoogleCredential; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LocalGoogleCredential" (id, "accessToken", "folderId", "pageToken", "channelId", subscribed, "createdAt", "updatedAt", "userId") FROM stdin;
\.


--
-- Data for Name: Notion; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Notion" (id, "accessToken", "workspaceId", "databaseId", "workspaceName", "workspaceIcon", "userId") FROM stdin;
\.


--
-- Data for Name: Slack; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Slack" (id, "appId", "authedUserId", "authedUserToken", "slackAccessToken", "botUserId", "teamId", "teamName", "userId") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."User" (id, "clerkId", name, email, "profileImage", tier, credits, "createdAt", "updatedAt", "localGoogleId", "googleResourceId") FROM stdin;
1	user_34xwscSDU0eIqiyZSZCN7L3RBAC	Daksh	dakshcjain@gmail.com	https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvb2F1dGhfZ29vZ2xlL2ltZ18zNHh3c2tveXl4dmhpRUVacVFtd1FXcEFZRlEifQ	Free	10	2025-11-03 11:19:02.268	2025-11-03 11:26:58.925	\N	\N
4	user_37WoBjtLBxW0BCi7H3cBtJja6RV	Vi-rusHacks	virustechhacks@gmail.com	https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvb2F1dGhfZ29vZ2xlL2ltZ18zN1dvQmtnbmdjaHdHQ2JkSzlNTkplelZFRDAifQ	Free	10	2025-11-05 17:34:46.825	2025-12-29 19:06:56.426	\N	\N
\.


--
-- Data for Name: WorkflowExecution; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."WorkflowExecution" (id, "workflowId", status, "startedAt", "completedAt", error, "executionLogs", "triggerType") FROM stdin;
\.


--
-- Data for Name: Workflows; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Workflows" (id, nodes, edges, name, "discordTemplate", "notionTemplate", "slackTemplate", "slackChannels", "slackAccessToken", "notionAccessToken", "notionDbId", "flowPath", "cronPath", publish, description, "userId", "emailSubject", "emailTemplate", "emailTo") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
76a3b56b-e595-49c6-b44e-8914c7419798	c762c8ee4787e9d0946a1b41b8cc6b4b43d01f35fba96a9bf6dabe15d0088cfa	2025-03-05 21:03:46.677076+00	20250305210343_update_user_model	\N	\N	2025-03-05 21:03:45.322536+00	1
\.


--
-- Name: User_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."User_id_seq"', 15, true);


--
-- Name: Connections Connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Connections"
    ADD CONSTRAINT "Connections_pkey" PRIMARY KEY (id);


--
-- Name: DiscordWebhook DiscordWebhook_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DiscordWebhook"
    ADD CONSTRAINT "DiscordWebhook_pkey" PRIMARY KEY (id);


--
-- Name: LocalGoogleCredential LocalGoogleCredential_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LocalGoogleCredential"
    ADD CONSTRAINT "LocalGoogleCredential_pkey" PRIMARY KEY (id);


--
-- Name: Notion Notion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Notion"
    ADD CONSTRAINT "Notion_pkey" PRIMARY KEY (id);


--
-- Name: Slack Slack_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Slack"
    ADD CONSTRAINT "Slack_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: WorkflowExecution WorkflowExecution_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkflowExecution"
    ADD CONSTRAINT "WorkflowExecution_pkey" PRIMARY KEY (id);


--
-- Name: Workflows Workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Workflows"
    ADD CONSTRAINT "Workflows_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Connections_type_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Connections_type_key" ON public."Connections" USING btree (type);


--
-- Name: DiscordWebhook_channelId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "DiscordWebhook_channelId_key" ON public."DiscordWebhook" USING btree ("channelId");


--
-- Name: DiscordWebhook_url_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "DiscordWebhook_url_key" ON public."DiscordWebhook" USING btree (url);


--
-- Name: DiscordWebhook_webhookId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "DiscordWebhook_webhookId_key" ON public."DiscordWebhook" USING btree ("webhookId");


--
-- Name: LocalGoogleCredential_accessToken_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "LocalGoogleCredential_accessToken_key" ON public."LocalGoogleCredential" USING btree ("accessToken");


--
-- Name: LocalGoogleCredential_channelId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "LocalGoogleCredential_channelId_key" ON public."LocalGoogleCredential" USING btree ("channelId");


--
-- Name: LocalGoogleCredential_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "LocalGoogleCredential_userId_key" ON public."LocalGoogleCredential" USING btree ("userId");


--
-- Name: Notion_accessToken_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Notion_accessToken_key" ON public."Notion" USING btree ("accessToken");


--
-- Name: Notion_databaseId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Notion_databaseId_key" ON public."Notion" USING btree ("databaseId");


--
-- Name: Notion_workspaceId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Notion_workspaceId_key" ON public."Notion" USING btree ("workspaceId");


--
-- Name: Slack_authedUserToken_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Slack_authedUserToken_key" ON public."Slack" USING btree ("authedUserToken");


--
-- Name: Slack_slackAccessToken_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Slack_slackAccessToken_key" ON public."Slack" USING btree ("slackAccessToken");


--
-- Name: User_clerkId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_clerkId_key" ON public."User" USING btree ("clerkId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_googleResourceId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_googleResourceId_key" ON public."User" USING btree ("googleResourceId");


--
-- Name: User_localGoogleId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_localGoogleId_key" ON public."User" USING btree ("localGoogleId");


--
-- Name: WorkflowExecution_startedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WorkflowExecution_startedAt_idx" ON public."WorkflowExecution" USING btree ("startedAt");


--
-- Name: WorkflowExecution_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WorkflowExecution_status_idx" ON public."WorkflowExecution" USING btree (status);


--
-- Name: WorkflowExecution_workflowId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WorkflowExecution_workflowId_idx" ON public."WorkflowExecution" USING btree ("workflowId");


--
-- Name: Connections Connections_discordWebhookId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Connections"
    ADD CONSTRAINT "Connections_discordWebhookId_fkey" FOREIGN KEY ("discordWebhookId") REFERENCES public."DiscordWebhook"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Connections Connections_notionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Connections"
    ADD CONSTRAINT "Connections_notionId_fkey" FOREIGN KEY ("notionId") REFERENCES public."Notion"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Connections Connections_slackId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Connections"
    ADD CONSTRAINT "Connections_slackId_fkey" FOREIGN KEY ("slackId") REFERENCES public."Slack"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Connections Connections_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Connections"
    ADD CONSTRAINT "Connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"("clerkId") ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DiscordWebhook DiscordWebhook_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DiscordWebhook"
    ADD CONSTRAINT "DiscordWebhook_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"("clerkId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LocalGoogleCredential LocalGoogleCredential_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LocalGoogleCredential"
    ADD CONSTRAINT "LocalGoogleCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Notion Notion_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Notion"
    ADD CONSTRAINT "Notion_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"("clerkId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Slack Slack_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Slack"
    ADD CONSTRAINT "Slack_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"("clerkId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: WorkflowExecution WorkflowExecution_workflowId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkflowExecution"
    ADD CONSTRAINT "WorkflowExecution_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES public."Workflows"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Workflows Workflows_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Workflows"
    ADD CONSTRAINT "Workflows_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"("clerkId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

