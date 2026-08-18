r -d talkar_db --schema-only > ~/current_live_schema.sql
ubuntu@instance-20260630-1713:/var/www/voice-agent/service/talker-fb$ ^C
ubuntu@instance-20260630-1713:/var/www/voice-agent/service/talker-fb$ cat ~/current_live_schema.sql
--
-- PostgreSQL database dump
--

\restrict OgLpONiVJW2asBSKm7uYYIWXF57M8pcRv4GAi50A3dUWjr2086h7VMckU17P3qM

-- Dumped from database version 15.18 (Debian 15.18-1.pgdg13+1)
-- Dumped by pg_dump version 15.18 (Debian 15.18-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: talkar
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO talkar;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: talkar
--

COMMENT ON SCHEMA public IS '';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner:
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: agents; Type: TABLE; Schema: public; Owner: talkar
--

CREATE TABLE public.agents (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    name text NOT NULL,
    use_case text,
    language text,
    dograh_workflow_id integer,
    dograh_org_id integer,
    status text DEFAULT 'building'::text,
    built_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    per_minute_rate_paise bigint
);


ALTER TABLE public.agents OWNER TO talkar;

--
-- Name: agents_id_seq; Type: SEQUENCE; Schema: public; Owner: talkar
--

CREATE SEQUENCE public.agents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.agents_id_seq OWNER TO talkar;

--
-- Name: agents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: talkar
--

ALTER SEQUENCE public.agents_id_seq OWNED BY public.agents.id;


--
-- Name: call_logs; Type: TABLE; Schema: public; Owner: talkar
--

CREATE TABLE public.call_logs (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    agent_id integer,
    phone_number_id integer,
    call_type text,
    caller_number text,
    duration_seconds integer DEFAULT 0,
    cost_to_customer_paise bigint DEFAULT 0,
    dograh_run_id integer NOT NULL,
    called_at timestamp with time zone NOT NULL,
    processed_at timestamp with time zone
);


ALTER TABLE public.call_logs OWNER TO talkar;

--
-- Name: call_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: talkar
--

CREATE SEQUENCE public.call_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.call_logs_id_seq OWNER TO talkar;

--
-- Name: call_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: talkar
--

ALTER SEQUENCE public.call_logs_id_seq OWNED BY public.call_logs.id;


--
-- Name: customers; Type: TABLE; Schema: public; Owner: talkar
--

CREATE TABLE public.customers (
    id integer NOT NULL,
    company_name text NOT NULL,
    industry text,
    contact_name text NOT NULL,
    contact_email text NOT NULL,
    contact_phone text,
    status text DEFAULT 'pending_approval'::text NOT NULL,
    onboarding_form jsonb,
    documents jsonb,
    dograh_org_id integer,
    dograh_user_id integer,
    setup_fee_order_id text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    billing_org_id integer
);


ALTER TABLE public.customers OWNER TO talkar;

--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: talkar
--

CREATE SEQUENCE public.customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.customers_id_seq OWNER TO talkar;

--
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: talkar
--

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;


--
-- Name: phone_number_requests; Type: TABLE; Schema: public; Owner: talkar
--

CREATE TABLE public.phone_number_requests (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    region text,
    use_case text,
    status text DEFAULT 'pending'::text,
    admin_note text,
    requested_at timestamp with time zone DEFAULT now(),
    resolved_at timestamp with time zone
);


ALTER TABLE public.phone_number_requests OWNER TO talkar;

--
-- Name: phone_number_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: talkar
--

CREATE SEQUENCE public.phone_number_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.phone_number_requests_id_seq OWNER TO talkar;

--
-- Name: phone_number_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: talkar
--

ALTER SEQUENCE public.phone_number_requests_id_seq OWNED BY public.phone_number_requests.id;


--
-- Name: phone_numbers; Type: TABLE; Schema: public; Owner: talkar
--

CREATE TABLE public.phone_numbers (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    number text NOT NULL,
    country text DEFAULT 'IN'::text,
    plivo_number_id text,
    dograh_phone_number_id text,
    agent_id integer,
    monthly_cost_paise bigint,
    status text DEFAULT 'active'::text,
    purchased_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.phone_numbers OWNER TO talkar;

--
-- Name: phone_numbers_id_seq; Type: SEQUENCE; Schema: public; Owner: talkar
--

CREATE SEQUENCE public.phone_numbers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.phone_numbers_id_seq OWNER TO talkar;

--
-- Name: phone_numbers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: talkar
--

ALTER SEQUENCE public.phone_numbers_id_seq OWNED BY public.phone_numbers.id;


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: talkar
--

CREATE TABLE public.subscriptions (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    plan text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    per_minute_rate_paise bigint NOT NULL,
    setup_fee_paid boolean DEFAULT false,
    start_date date NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.subscriptions OWNER TO talkar;

--
-- Name: subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: talkar
--

CREATE SEQUENCE public.subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.subscriptions_id_seq OWNER TO talkar;

--
-- Name: subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: talkar
--

ALTER SEQUENCE public.subscriptions_id_seq OWNED BY public.subscriptions.id;


--
-- Name: support_requests; Type: TABLE; Schema: public; Owner: talkar
--

CREATE TABLE public.support_requests (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    type text NOT NULL,
    subject text NOT NULL,
    description text NOT NULL,
    agent_id integer,
    status text DEFAULT 'open'::text NOT NULL,
    admin_note text,
    resolved_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    resolved_at timestamp with time zone
);


ALTER TABLE public.support_requests OWNER TO talkar;

--
-- Name: support_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: talkar
--

CREATE SEQUENCE public.support_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.support_requests_id_seq OWNER TO talkar;

--
-- Name: support_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: talkar
--

ALTER SEQUENCE public.support_requests_id_seq OWNED BY public.support_requests.id;


--
-- Name: talkar_admins; Type: TABLE; Schema: public; Owner: talkar
--

CREATE TABLE public.talkar_admins (
    id integer NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    name text NOT NULL,
    role text DEFAULT 'admin'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.talkar_admins OWNER TO talkar;

--
-- Name: talkar_admins_id_seq; Type: SEQUENCE; Schema: public; Owner: talkar
--

CREATE SEQUENCE public.talkar_admins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.talkar_admins_id_seq OWNER TO talkar;

--
-- Name: talkar_admins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: talkar
--

ALTER SEQUENCE public.talkar_admins_id_seq OWNED BY public.talkar_admins.id;


--
-- Name: wallet_transactions; Type: TABLE; Schema: public; Owner: talkar
--

CREATE TABLE public.wallet_transactions (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    type text NOT NULL,
    amount_paise bigint NOT NULL,
    description text,
    dograh_run_id integer,
    razorpay_order_id text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.wallet_transactions OWNER TO talkar;

--
-- Name: wallet_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: talkar
--

CREATE SEQUENCE public.wallet_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.wallet_transactions_id_seq OWNER TO talkar;

--
-- Name: wallet_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: talkar
--

ALTER SEQUENCE public.wallet_transactions_id_seq OWNED BY public.wallet_transactions.id;


--
-- Name: wallets; Type: TABLE; Schema: public; Owner: talkar
--

CREATE TABLE public.wallets (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    balance_paise bigint DEFAULT 0 NOT NULL,
    auto_recharge_enabled boolean DEFAULT false,
    auto_recharge_threshold_paise bigint DEFAULT 100000,
    auto_recharge_amount_paise bigint DEFAULT 500000,
    razorpay_customer_id text,
    razorpay_payment_method_id text,
    low_balance_alerted_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.wallets OWNER TO talkar;

--
-- Name: wallets_id_seq; Type: SEQUENCE; Schema: public; Owner: talkar
--

CREATE SEQUENCE public.wallets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.wallets_id_seq OWNER TO talkar;

--
-- Name: wallets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: talkar
--

ALTER SEQUENCE public.wallets_id_seq OWNED BY public.wallets.id;


--
-- Name: agents id; Type: DEFAULT; Schema: public; Owner: talkar
--

ALTER TABLE ONLY public.agents ALTER COLUMN id SET DEFAULT nextval('public.agents_id_seq'::regclass);


--
-- Name: call_logs id; Type: DEFAULT; Schema: public; Owner: talkar
--

ALTER TABLE ONLY public.call_logs ALTER COLUMN id SET DEFAULT nextval('public.call_logs_id_seq'::regclass);


--
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: talkar
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- Name: phone_number_requests id; Type: DEFAULT; Schema: public; Owner: talkar
--

ALTER TABLE ONLY public.phone_number_requests ALTER COLUMN id SET DEFAULT nextval('public.phone_number_requests_id_seq'::regclass);


--
-- Name: phone_numbers id; Type: DEFAULT; Schema: public; Owner: talkar
--

ALTER TABLE ONLY public.phone_numbers ALTER COLUMN id SET DEFAULT nextval('public.phone_numbers_id_seq'::regclass);


--
-- Name: subscriptions id; Type: DEFAULT; Schema: public; Owner: talkar
--

ALTER TABLE ONLY public.subscriptions ALTER COLUMN id SET DEFAULT nextval('public.subscriptions_id_seq'::regclass);


--
-- Name: support_requests id; Type: DEFAULT; Schema: public; Owner: talkar
--

ALTER TABLE ONLY public.support_requests ALTER COLUMN id SET DEFAULT nextval('public.support_requests_id_seq'::regclass);


--
-- Name: talkar_admins id; Type: DEFAULT; Schema: public; Owner: talkar
--

ALTER TABLE ONLY public.talkar_admins ALTER COLUMN id SET DEFAULT nextval('public.talkar_admins_id_seq'::regclass);


--
-- Name: wallet_transactions id; Type: DEFAULT; Schema: public; Owner: talkar
--

ALTER TABLE ONLY public.wallet_transactions ALTER COLUMN id SET DEFAULT nextval('public.wallet_transactions_id_seq'::regclass);


--
-- Name: wallets id; Type: DEFAULT; Schema: public; Owner: talkar
--

ALTER TABLE ONLY public.wallets ALTER COLUMN id SET DEFAULT nextval('public.wallets_id_seq'::regclass);


--
-- Name: agents agents_pkey; Type: CONSTRAINT; Schema: public; Owner: talkar
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_pkey PRIMARY KEY (id);


--
-- Name: call_logs call_logs_dograh_run_id_key; Type: CONSTRAINT; Schema: public; Owner: talkar
--

ALTER TABLE ONLY public.call_logs
    ADD CONSTRAINT call_logs_dograh_run_id_key UNIQUE (dograh_run_id);


--
-- Name: call_logs call_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: talkar
--

ALTER TABLE ONLY public.call_logs
    ADD CONSTRAINT call_logs_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: talkar
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: phone_number_requests phone_number_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: talkar
--

ALTER TABLE ONLY public.phone_number_requests
    ADD CONSTRAINT phone_number_requests_pkey PRIMARY KEY (id);


--
-- Name: phone_numbers phone_numbers_pkey; Type: CONSTRAINT; Schema: public; Owner: talkar
--

ALTER TABLE ONLY public.phone_numbers
    ADD CONSTRAINT phone_numbers_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: talkar
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: support_requests support_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: talkar
--

ALTER TABLE ONLY public.support_requests
    ADD CONSTRAINT support_requests_pkey PRIMARY KEY (id);


--
-- Name: talkar_admins talkar_admins_email_key; Type: CONSTRAINT; Schema: public; Owner: talkar
--

ALTER TABLE ONLY public.talkar_admins
    ADD CONSTRAINT talkar_admins_email_key UNIQUE (email);


--
-- Name: talkar_admins talkar_admins_pkey; Type: CONSTRAINT; Schema: public; Owner: talkar
--

ALTER TABLE ONLY public.talkar_admins
    ADD CONSTRAINT talkar_admins_pkey PRIMARY KEY (id);


--
-- Name: wallet_transactions wallet_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: talkar
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id);


--
-- Name: wallets wallets_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: talkar
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_customer_id_key UNIQUE (customer_id);


--
-- Name: wallets wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: talkar
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);


--
-- Name: idx_call_logs_processed_at; Type: INDEX; Schema: public; Owner: talkar
--

CREATE INDEX idx_call_logs_processed_at ON public.call_logs USING btree (processed_at) WHERE (processed_at IS NULL);


--
-- Name: idx_customers_dograh_org_id; Type: INDEX; Schema: public; Owner: talkar
--

CREATE INDEX idx_customers_dograh_org_id ON public.customers USING btree (dograh_org_id);


--
-- Name: idx_customers_status; Type: INDEX; Schema: public; Owner: talkar
--

CREATE INDEX idx_customers_status ON public.customers USING btree (status);


--
-- Name: idx_wallet_transactions_customer; Type: INDEX; Schema: public; Owner: talkar
--

CREATE INDEX idx_wallet_transactions_customer ON public.wallet_transactions USING btree (customer_id, created_at DESC);


--
-- Name: idx_wallet_transactions_razorpay; Type: INDEX; Schema: public; Owner: talkar
--

CREATE INDEX idx_wallet_transactions_razorpay ON public.wallet_transactions USING btree (razorpay_order_id) WHERE (razorpay_order_id IS NOT NULL);


--
-- Name: uq_customers_email_org; Type: INDEX; Schema: public; Owner: talkar
--

CREATE UNIQUE INDEX uq_customers_email_org ON public.customers USING btree (contact_email, dograh_org_id);


--
-- Name: agents agents_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: talkar
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: call_logs call_logs_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: talkar
--

ALTER TABLE ONLY public.call_logs
    ADD CONSTRAINT call_logs_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id);


--
-- Name: call_logs call_logs_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: talkar
--

ALTER TABLE ONLY public.call_logs
    ADD CONSTRAINT call_logs_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: call_logs call_logs_phone_number_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: talkar
--

ALTER TABLE ONLY public.call_logs
    ADD CONSTRAINT call_logs_phone_number_id_fkey FOREIGN KEY (phone_number_id) REFERENCES public.phone_numbers(id);


--
-- Name: customers customers_billing_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: talkar
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_billing_org_id_fkey FOREIGN KEY (billing_org_id) REFERENCES public.customers(id);


--
-- Name: phone_numbers fk_phone_numbers_agent; Type: FK CONSTRAINT; Schema: public; Owner: talkar
--

ALTER TABLE ONLY public.phone_numbers
    ADD CONSTRAINT fk_phone_numbers_agent FOREIGN KEY (agent_id) REFERENCES public.agents(id);


--
-- Name: phone_number_requests phone_number_requests_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: talkar
--

ALTER TABLE ONLY public.phone_number_requests
    ADD CONSTRAINT phone_number_requests_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: phone_numbers phone_numbers_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: talkar
--

ALTER TABLE ONLY public.phone_numbers
    ADD CONSTRAINT phone_numbers_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: subscriptions subscriptions_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: talkar
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: support_requests support_requests_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: talkar
--

ALTER TABLE ONLY public.support_requests
    ADD CONSTRAINT support_requests_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id);


--
-- Name: support_requests support_requests_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: talkar
--

ALTER TABLE ONLY public.support_requests
    ADD CONSTRAINT support_requests_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: support_requests support_requests_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: talkar
--

ALTER TABLE ONLY public.support_requests
    ADD CONSTRAINT support_requests_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.talkar_admins(id);


--
-- Name: wallet_transactions wallet_transactions_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: talkar
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: wallets wallets_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: talkar
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: talkar
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict OgLpONiVJW2asBSKm7uYYIWXF57M8pcRv4GAi50A3dUWjr2086h7VMckU17P3qM

ubuntu@instance-20260630-1713:/var/www/voice-agent/service/talker-fb$