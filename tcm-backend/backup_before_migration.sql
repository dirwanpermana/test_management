--
-- PostgreSQL database dump
--

\restrict ThxPQRGcD8WmUkAsIb5eJM9rrgSUevrOUDOarUx4RmDpdGG19xGAj9KgB7wLosd

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

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
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: fn_before_insert_bug(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_before_insert_bug() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_seq INT;
BEGIN
    INSERT INTO bug_daily_counter (counter_date, last_seq)
    VALUES (CURRENT_DATE, 1)
    ON CONFLICT (counter_date)
    DO UPDATE SET last_seq = bug_daily_counter.last_seq + 1
    RETURNING last_seq INTO v_seq;

    NEW.bug_no := 'BUG-' || to_char(now(),'YYMMDD') || '-' || lpad(v_seq::text,2,'0');
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_before_insert_bug() OWNER TO postgres;

--
-- Name: fn_before_insert_test_case_item(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_before_insert_test_case_item() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_seq    INT;
    v_header CHAR(6);
BEGIN
    INSERT INTO test_case_daily_counter (counter_date, last_seq)
    VALUES (CURRENT_DATE, 1)
    ON CONFLICT (counter_date)
    DO UPDATE SET last_seq = test_case_daily_counter.last_seq + 1
    RETURNING last_seq INTO v_seq;

    SELECT header_code INTO v_header FROM test_case_headers WHERE id = NEW.header_id;

    NEW.seq_no  := v_seq;
    NEW.case_no := v_header || '-' || lpad(v_seq::text, 2, '0');
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_before_insert_test_case_item() OWNER TO postgres;

--
-- Name: fn_log_bug_created(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_log_bug_created() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO bug_status_history (bug_id, from_status, to_status, changed_by)
    VALUES (NEW.id, NULL, NEW.status, NEW.reporter_id);
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_log_bug_created() OWNER TO postgres;

--
-- Name: fn_log_bug_status_change(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_log_bug_status_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status) THEN
        INSERT INTO bug_status_history (bug_id, from_status, to_status, changed_by)
        VALUES (NEW.id, OLD.status, NEW.status, COALESCE(NEW.updated_by, NEW.reporter_id));
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_log_bug_status_change() OWNER TO postgres;

--
-- Name: fn_set_header_code(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_set_header_code() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.header_code := to_char(now(), 'YYMMDD');
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_set_header_code() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: attachments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    attachable_type character varying(20) NOT NULL,
    attachable_id uuid NOT NULL,
    file_url character varying(500) NOT NULL,
    file_name character varying(255) NOT NULL,
    uploaded_by uuid NOT NULL,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT attachments_attachable_type_check CHECK (((attachable_type)::text = ANY ((ARRAY['test_case_item'::character varying, 'bug'::character varying])::text[])))
);


ALTER TABLE public.attachments OWNER TO postgres;

--
-- Name: bug_comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bug_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bug_id uuid NOT NULL,
    user_id uuid NOT NULL,
    comment text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.bug_comments OWNER TO postgres;

--
-- Name: bug_daily_counter; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bug_daily_counter (
    counter_date date NOT NULL,
    last_seq integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.bug_daily_counter OWNER TO postgres;

--
-- Name: bug_status_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bug_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bug_id uuid NOT NULL,
    from_status character varying(20),
    to_status character varying(20) NOT NULL,
    changed_by uuid NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.bug_status_history OWNER TO postgres;

--
-- Name: bug_status_transitions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bug_status_transitions (
    from_status character varying(20) NOT NULL,
    to_status character varying(20) NOT NULL,
    allowed_role character varying(10) NOT NULL
);


ALTER TABLE public.bug_status_transitions OWNER TO postgres;

--
-- Name: bugs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bugs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bug_no character varying(14),
    test_case_item_id uuid,
    reporter_id uuid NOT NULL,
    scenario text NOT NULL,
    steps_to_reproduce text NOT NULL,
    expected_result text NOT NULL,
    actual_result text NOT NULL,
    status character varying(20) DEFAULT 'Open'::character varying NOT NULL,
    severity character varying(10) DEFAULT 'Medium'::character varying NOT NULL,
    priority character varying(10) DEFAULT 'Medium'::character varying NOT NULL,
    assigned_to uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bugs_priority_check CHECK (((priority)::text = ANY ((ARRAY['Critical'::character varying, 'High'::character varying, 'Medium'::character varying, 'Low'::character varying])::text[]))),
    CONSTRAINT bugs_severity_check CHECK (((severity)::text = ANY ((ARRAY['Critical'::character varying, 'Major'::character varying, 'Medium'::character varying, 'Low'::character varying])::text[]))),
    CONSTRAINT bugs_status_check CHECK (((status)::text = ANY ((ARRAY['Open'::character varying, 'On Progress Dev'::character varying, 'Ready to Test'::character varying, 'On Progress QA'::character varying, 'Reopen'::character varying, 'Close'::character varying, 'Take Out'::character varying, 'Hold'::character varying])::text[])))
);


ALTER TABLE public.bugs OWNER TO postgres;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    code character varying(10) NOT NULL,
    name character varying(50) NOT NULL
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: test_case_daily_counter; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.test_case_daily_counter (
    counter_date date NOT NULL,
    last_seq integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.test_case_daily_counter OWNER TO postgres;

--
-- Name: test_case_headers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.test_case_headers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    header_code character(6) NOT NULL,
    nama_test_case character varying(255) NOT NULL,
    sprint integer,
    jira_url character varying(500),
    nama_menu character varying(255) NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.test_case_headers OWNER TO postgres;

--
-- Name: test_case_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.test_case_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    header_id uuid NOT NULL,
    case_no character varying(9),
    seq_no integer NOT NULL,
    feature_name character varying(255) NOT NULL,
    test_type character varying(10) NOT NULL,
    scenario text NOT NULL,
    steps text NOT NULL,
    test_data text,
    expected_result text NOT NULL,
    status character varying(20) DEFAULT 'Not Executed'::character varying NOT NULL,
    pic_qa uuid NOT NULL,
    test_date date,
    note text,
    pic_dev uuid,
    dev_area character varying(20),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT test_case_items_dev_area_check CHECK (((dev_area)::text = ANY ((ARRAY['Backend'::character varying, 'Frontend'::character varying])::text[]))),
    CONSTRAINT test_case_items_status_check CHECK (((status)::text = ANY ((ARRAY['Not Executed'::character varying, 'Pass'::character varying, 'Fail'::character varying, 'Blocked'::character varying, 'On Hold'::character varying])::text[]))),
    CONSTRAINT test_case_items_test_type_check CHECK (((test_type)::text = ANY ((ARRAY['Positive'::character varying, 'Negative'::character varying])::text[])))
);


ALTER TABLE public.test_case_items OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username character varying(50) NOT NULL,
    password_hash character varying(255) NOT NULL,
    full_name character varying(150) NOT NULL,
    email character varying(150) NOT NULL,
    role_id integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: v_bug_monitoring; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_bug_monitoring AS
 SELECT b.status,
    dev.full_name AS assigned_to_name,
    (count(*))::integer AS total_bug
   FROM (public.bugs b
     LEFT JOIN public.users dev ON ((dev.id = b.assigned_to)))
  GROUP BY b.status, dev.full_name;


ALTER VIEW public.v_bug_monitoring OWNER TO postgres;

--
-- Name: v_test_case_monitoring; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_test_case_monitoring AS
 SELECT h.id AS header_id,
    h.header_code,
    h.nama_test_case,
    (count(i.id))::integer AS total_case,
    (count(i.id) FILTER (WHERE ((i.status)::text = ANY ((ARRAY['Pass'::character varying, 'Fail'::character varying, 'Blocked'::character varying])::text[]))))::integer AS executed_case,
    (round(((100.0 * (count(i.id) FILTER (WHERE ((i.status)::text = ANY ((ARRAY['Pass'::character varying, 'Fail'::character varying, 'Blocked'::character varying])::text[]))))::numeric) / (NULLIF(count(i.id), 0))::numeric), 2))::double precision AS percentage,
        CASE
            WHEN (count(i.id) FILTER (WHERE ((i.status)::text = 'On Hold'::text)) > 0) THEN 'Hold'::text
            WHEN ((count(i.id) FILTER (WHERE ((i.status)::text = ANY ((ARRAY['Pass'::character varying, 'Fail'::character varying, 'Blocked'::character varying])::text[]))) = count(i.id)) AND (count(i.id) > 0)) THEN 'Complete'::text
            ELSE 'On Progress'::text
        END AS category,
    string_agg(DISTINCT (u.full_name)::text, ', '::text) AS pic_qa_names
   FROM ((public.test_case_headers h
     LEFT JOIN public.test_case_items i ON ((i.header_id = h.id)))
     LEFT JOIN public.users u ON ((u.id = i.pic_qa)))
  GROUP BY h.id, h.header_code, h.nama_test_case;


ALTER VIEW public.v_test_case_monitoring OWNER TO postgres;

--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Data for Name: attachments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attachments (id, attachable_type, attachable_id, file_url, file_name, uploaded_by, uploaded_at) FROM stdin;
ab0ac501-5460-4daf-9277-798ecc2f44dc	bug	cdced68a-dec0-42fc-9fea-c3f61b93d9ed	http://localhost:4000/uploads/1785083911599-221974462.png	luffy.png	b26c5ace-6ccc-437c-bd39-879c385cdad8	2026-07-26 16:38:31.624252+00
\.


--
-- Data for Name: bug_comments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bug_comments (id, bug_id, user_id, comment, created_at) FROM stdin;
\.


--
-- Data for Name: bug_daily_counter; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bug_daily_counter (counter_date, last_seq) FROM stdin;
2026-07-26	1
\.


--
-- Data for Name: bug_status_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bug_status_history (id, bug_id, from_status, to_status, changed_by, changed_at) FROM stdin;
86a58b15-ebc8-4718-a022-50e6a577a532	cdced68a-dec0-42fc-9fea-c3f61b93d9ed	\N	Open	b26c5ace-6ccc-437c-bd39-879c385cdad8	2026-07-26 16:38:31.560775+00
\.


--
-- Data for Name: bug_status_transitions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bug_status_transitions (from_status, to_status, allowed_role) FROM stdin;
Open	On Progress Dev	DEV
Open	Hold	QA
Open	Take Out	QA
On Progress Dev	Ready to Test	DEV
On Progress Dev	Hold	DEV
Ready to Test	On Progress QA	QA
On Progress QA	Close	QA
On Progress QA	Reopen	QA
Reopen	On Progress Dev	DEV
Hold	Open	QA
\.


--
-- Data for Name: bugs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bugs (id, bug_no, test_case_item_id, reporter_id, scenario, steps_to_reproduce, expected_result, actual_result, status, severity, priority, assigned_to, updated_by, created_at, updated_at) FROM stdin;
cdced68a-dec0-42fc-9fea-c3f61b93d9ed	BUG-260726-01	\N	b26c5ace-6ccc-437c-bd39-879c385cdad8	gitu	tes	tes	ok	Open	Major	Medium	afdc4d03-8e31-4623-aa9c-62a728e6e7d2	\N	2026-07-26 16:38:31.560775+00	2026-07-26 17:14:23.329467+00
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, code, name) FROM stdin;
1	QA	Quality Assurance
2	DEV	Developer
\.


--
-- Data for Name: test_case_daily_counter; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.test_case_daily_counter (counter_date, last_seq) FROM stdin;
2026-07-26	74
\.


--
-- Data for Name: test_case_headers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.test_case_headers (id, header_code, nama_test_case, sprint, jira_url, nama_menu, created_by, created_at, updated_at) FROM stdin;
228868b6-9488-4f15-a0e2-335d9246e772	260726	cobalagi	25	https://tes	tes	b26c5ace-6ccc-437c-bd39-879c385cdad8	2026-07-26 17:13:42.123572+00	2026-07-26 17:13:42.123572+00
d649a57d-fcfa-4baf-96d6-75587a0a1a48	260726	Contoh Test Case	24	https://test	Menu Contoh	b26c5ace-6ccc-437c-bd39-879c385cdad8	2026-07-26 17:14:47.004464+00	2026-07-26 17:14:47.004464+00
\.


--
-- Data for Name: test_case_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.test_case_items (id, header_id, case_no, seq_no, feature_name, test_type, scenario, steps, test_data, expected_result, status, pic_qa, test_date, note, pic_dev, dev_area, created_at, updated_at) FROM stdin;
f4e3b702-308a-4a4f-8bc3-307321f56bee	228868b6-9488-4f15-a0e2-335d9246e772	260726-51	51	Contoh: verifikasi login	Positive	User login dengan kredensial valid	1. Buka halaman login\n2. Isi username & password\n3. Klik tombol Login	username: qa1, password: password123	User berhasil masuk ke dashboard	Not Executed	b26c5ace-6ccc-437c-bd39-879c385cdad8	2026-07-26	\N	\N	Frontend	2026-07-26 17:13:42.203597+00	2026-07-26 17:13:42.203597+00
79eb27aa-1bc1-414c-9359-17b0ea76487c	d649a57d-fcfa-4baf-96d6-75587a0a1a48	260726-52	52	test fiture	Negative	scenario tes	1. tes\r\n2. tes lagi	tes	gitu ya	Not Executed	b26c5ace-6ccc-437c-bd39-879c385cdad8	2026-07-26	\N	\N	Frontend	2026-07-26 17:14:47.098088+00	2026-07-26 17:14:47.098088+00
c6a81c4b-818d-42e4-8554-64aa2aeeee04	d649a57d-fcfa-4baf-96d6-75587a0a1a48	260726-53	53	test fiture	Negative	scenario tes	1. tes\r\n2. tes lagi	tes	gitu ya	Not Executed	b26c5ace-6ccc-437c-bd39-879c385cdad8	2026-07-26	\N	\N	Frontend	2026-07-26 17:14:47.115331+00	2026-07-26 17:14:47.115331+00
4dd75188-7036-47ba-9618-9a81a5334eae	d649a57d-fcfa-4baf-96d6-75587a0a1a48	260726-54	54	test fiture	Negative	scenario tes	1. tes\r\n2. tes lagi	tes	gitu ya	Not Executed	b26c5ace-6ccc-437c-bd39-879c385cdad8	2026-07-26	\N	\N	Frontend	2026-07-26 17:14:47.121511+00	2026-07-26 17:14:47.121511+00
453d443e-fba0-417f-9897-9936dab32769	d649a57d-fcfa-4baf-96d6-75587a0a1a48	260726-55	55	test fiture	Negative	scenario tes	1. tes\r\n2. tes lagi	tes	gitu ya	Not Executed	b26c5ace-6ccc-437c-bd39-879c385cdad8	2026-07-26	\N	\N	Frontend	2026-07-26 17:14:47.127806+00	2026-07-26 17:14:47.127806+00
1b61288f-7d2d-4ebb-874c-350d803d9975	d649a57d-fcfa-4baf-96d6-75587a0a1a48	260726-56	56	test fiture	Negative	scenario tes	1. tes\r\n2. tes lagi	tes	gitu ya	Not Executed	b26c5ace-6ccc-437c-bd39-879c385cdad8	2026-07-26	\N	\N	Frontend	2026-07-26 17:14:47.13417+00	2026-07-26 17:14:47.13417+00
03f248c9-7e18-4c4f-a6fb-9d20c33e0f11	d649a57d-fcfa-4baf-96d6-75587a0a1a48	260726-57	57	test fiture	Negative	scenario tes	1. tes\r\n2. tes lagi	tes	gitu ya	Not Executed	b26c5ace-6ccc-437c-bd39-879c385cdad8	2026-07-26	\N	\N	Frontend	2026-07-26 17:14:47.139599+00	2026-07-26 17:14:47.139599+00
a2ba6f26-f87c-4910-8432-e0f1fb8e2856	d649a57d-fcfa-4baf-96d6-75587a0a1a48	260726-58	58	test fiture	Negative	scenario tes	1. tes\r\n2. tes lagi	tes	gitu ya	Not Executed	b26c5ace-6ccc-437c-bd39-879c385cdad8	2026-07-26	\N	\N	Frontend	2026-07-26 17:14:47.145273+00	2026-07-26 17:14:47.145273+00
b0b199e0-97ed-4693-a061-b52b8ff69157	d649a57d-fcfa-4baf-96d6-75587a0a1a48	260726-59	59	test fiture	Negative	scenario tes	1. tes\r\n2. tes lagi	tes	gitu ya	Not Executed	b26c5ace-6ccc-437c-bd39-879c385cdad8	2026-07-26	\N	\N	Frontend	2026-07-26 17:14:47.150451+00	2026-07-26 17:14:47.150451+00
2684587e-8592-4c6d-acee-b76aab87e7b1	d649a57d-fcfa-4baf-96d6-75587a0a1a48	260726-60	60	test fiture	Negative	scenario tes	1. tes\r\n2. tes lagi	tes	gitu ya	Not Executed	b26c5ace-6ccc-437c-bd39-879c385cdad8	2026-07-26	\N	\N	Frontend	2026-07-26 17:14:47.155223+00	2026-07-26 17:14:47.155223+00
f1442c07-9645-4430-bb59-1f3f688316b6	d649a57d-fcfa-4baf-96d6-75587a0a1a48	260726-61	61	test fiture	Negative	scenario tes	1. tes\r\n2. tes lagi	tes	gitu ya	Not Executed	b26c5ace-6ccc-437c-bd39-879c385cdad8	2026-07-26	\N	\N	Frontend	2026-07-26 17:14:47.160658+00	2026-07-26 17:14:47.160658+00
908b4402-ac99-4d65-9a7f-089c1692a2eb	d649a57d-fcfa-4baf-96d6-75587a0a1a48	260726-62	62	test fiture	Negative	scenario tes	1. tes\r\n2. tes lagi	tes	gitu ya	Not Executed	b26c5ace-6ccc-437c-bd39-879c385cdad8	2026-07-26	\N	\N	Frontend	2026-07-26 17:14:47.16561+00	2026-07-26 17:14:47.16561+00
e1eae460-1450-403c-974f-a32386c3792c	d649a57d-fcfa-4baf-96d6-75587a0a1a48	260726-63	63	test fiture	Negative	scenario tes	1. tes\r\n2. tes lagi	tes	gitu ya	Not Executed	b26c5ace-6ccc-437c-bd39-879c385cdad8	2026-07-26	\N	\N	Frontend	2026-07-26 17:14:47.170581+00	2026-07-26 17:14:47.170581+00
ad4a9c11-5b64-4cd8-bf81-6bf42b3c77f9	d649a57d-fcfa-4baf-96d6-75587a0a1a48	260726-64	64	test fiture	Negative	scenario tes	1. tes\r\n2. tes lagi	tes	gitu ya	Not Executed	b26c5ace-6ccc-437c-bd39-879c385cdad8	2026-07-26	\N	\N	Frontend	2026-07-26 17:14:47.175644+00	2026-07-26 17:14:47.175644+00
eacab1ed-a78a-4b3a-95b0-a25d270ba5f6	d649a57d-fcfa-4baf-96d6-75587a0a1a48	260726-65	65	test fiture	Negative	scenario tes	1. tes\r\n2. tes lagi	tes	gitu ya	Not Executed	b26c5ace-6ccc-437c-bd39-879c385cdad8	2026-07-26	\N	\N	Frontend	2026-07-26 17:14:47.181701+00	2026-07-26 17:14:47.181701+00
11f65a79-7d0a-4fdb-adad-f76c9edc2a52	d649a57d-fcfa-4baf-96d6-75587a0a1a48	260726-66	66	test fiture	Negative	scenario tes	1. tes\r\n2. tes lagi	tes	gitu ya	Not Executed	b26c5ace-6ccc-437c-bd39-879c385cdad8	2026-07-26	\N	\N	Frontend	2026-07-26 17:14:47.186637+00	2026-07-26 17:14:47.186637+00
e7691000-7ea1-4ba0-88ef-464a17e96636	d649a57d-fcfa-4baf-96d6-75587a0a1a48	260726-67	67	test fiture	Negative	scenario tes	1. tes\r\n2. tes lagi	tes	gitu ya	Not Executed	b26c5ace-6ccc-437c-bd39-879c385cdad8	2026-07-26	\N	\N	Frontend	2026-07-26 17:14:47.191156+00	2026-07-26 17:14:47.191156+00
f0c8b769-c77f-4361-bcf2-ca60e1ea33af	d649a57d-fcfa-4baf-96d6-75587a0a1a48	260726-68	68	test fiture	Negative	scenario tes	1. tes\r\n2. tes lagi	tes	gitu ya	Not Executed	b26c5ace-6ccc-437c-bd39-879c385cdad8	2026-07-26	\N	\N	Frontend	2026-07-26 17:14:47.195875+00	2026-07-26 17:14:47.195875+00
2f78c2dd-7e59-427f-898e-e5accfedfbd0	d649a57d-fcfa-4baf-96d6-75587a0a1a48	260726-69	69	test fiture	Negative	scenario tes	1. tes\r\n2. tes lagi	tes	gitu ya	Not Executed	b26c5ace-6ccc-437c-bd39-879c385cdad8	2026-07-26	\N	\N	Frontend	2026-07-26 17:14:47.200318+00	2026-07-26 17:14:47.200318+00
8db1b999-a85c-454f-bb50-19429899b107	d649a57d-fcfa-4baf-96d6-75587a0a1a48	260726-70	70	test fiture	Negative	scenario tes	1. tes\r\n2. tes lagi	tes	gitu ya	Not Executed	b26c5ace-6ccc-437c-bd39-879c385cdad8	2026-07-26	\N	\N	Frontend	2026-07-26 17:14:47.204831+00	2026-07-26 17:14:47.204831+00
ef6e36ad-136f-4ce7-b89e-c34923a0059c	d649a57d-fcfa-4baf-96d6-75587a0a1a48	260726-71	71	test fiture	Negative	scenario tes	1. tes\r\n2. tes lagi	tes	gitu ya	Not Executed	b26c5ace-6ccc-437c-bd39-879c385cdad8	2026-07-26	\N	\N	Frontend	2026-07-26 17:14:47.20907+00	2026-07-26 17:14:47.20907+00
fb7f9eab-308d-47df-bdd7-df77941412d5	d649a57d-fcfa-4baf-96d6-75587a0a1a48	260726-72	72	test fiture	Negative	scenario tes	1. tes\r\n2. tes lagi	tes	gitu ya	Not Executed	b26c5ace-6ccc-437c-bd39-879c385cdad8	2026-07-26	\N	\N	Frontend	2026-07-26 17:14:47.213577+00	2026-07-26 17:14:47.213577+00
4b491b90-e1e5-40e7-a55e-9ded6a1845d7	d649a57d-fcfa-4baf-96d6-75587a0a1a48	260726-73	73	test fiture	Negative	scenario tes	1. tes\r\n2. tes lagi	tes	gitu ya	Not Executed	b26c5ace-6ccc-437c-bd39-879c385cdad8	2026-07-26	\N	\N	Frontend	2026-07-26 17:14:47.21793+00	2026-07-26 17:14:47.21793+00
d2c7de60-400a-4b8c-86ff-d125a3f9fe98	d649a57d-fcfa-4baf-96d6-75587a0a1a48	260726-74	74	test fiture	Negative	scenario tes	1. tes\r\n2. tes lagi	tes	gitu ya	Not Executed	b26c5ace-6ccc-437c-bd39-879c385cdad8	2026-07-26	\N	\N	Frontend	2026-07-26 17:14:47.222267+00	2026-07-26 17:14:47.222267+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, password_hash, full_name, email, role_id, is_active, created_at, updated_at) FROM stdin;
b26c5ace-6ccc-437c-bd39-879c385cdad8	001dirwan	$2b$10$GANY7HI2JN61Nbx7EHycBOfdTotNweBiNIvinKRfDxc7yMEDIGpU6	Dirwan (QA)	dirwan.permana@kopnus.com	1	t	2026-07-26 16:23:28.008221+00	2026-07-26 16:23:28.008221+00
506c2c11-4e51-4507-a672-1162baf3721f	001dimas	$2b$10$8CYsbnbGd0928q6aCv7Bi.Q0Gkjye4nQiQ0leVCdRTXZk9If95Pr6	Dimas (QA)	dimas@kopnus.com	1	t	2026-07-26 17:06:17.752767+00	2026-07-26 17:06:17.752767+00
9e1ac102-3723-46b9-8d6c-46df85796af8	001alfan	$2b$10$8CYsbnbGd0928q6aCv7Bi.Q0Gkjye4nQiQ0leVCdRTXZk9If95Pr6	alfan (QA)	alfan@kopnus.com	1	t	2026-07-26 17:07:16.891421+00	2026-07-26 17:07:16.891421+00
cf275b4e-8344-4f79-b134-a7e0db5f1947	001nadia	$2b$10$8CYsbnbGd0928q6aCv7Bi.Q0Gkjye4nQiQ0leVCdRTXZk9If95Pr6	Nadia (QA)	nadia.noor@kopnus.com	1	t	2026-07-26 17:07:42.81114+00	2026-07-26 17:07:42.81114+00
30d2c7c0-6dc8-4a80-9408-47e2a50ab78b	001Rizki	$2b$10$8CYsbnbGd0928q6aCv7Bi.Q0Gkjye4nQiQ0leVCdRTXZk9If95Pr6	Rizki (QA)	rizki@kopnus.com	1	t	2026-07-26 17:08:20.519271+00	2026-07-26 17:08:20.519271+00
85dd11f8-7adc-446c-9e9b-3f83e63d2ad6	001dhandy	$2b$10$8CYsbnbGd0928q6aCv7Bi.Q0Gkjye4nQiQ0leVCdRTXZk9If95Pr6	Dhandy (QA)	qa2@kopnus.com	1	t	2026-07-26 16:23:28.023754+00	2026-07-26 16:23:28.023754+00
a568a320-a6f7-46c3-a4ec-c4212bef3142	001hendi	$2b$10$8CYsbnbGd0928q6aCv7Bi.Q0Gkjye4nQiQ0leVCdRTXZk9If95Pr6	Hendi (QA)	hendi.hadinata@kopnus.com	1	t	2026-07-26 17:03:56.45177+00	2026-07-26 17:03:56.45177+00
53e07930-4a66-4e3d-8436-3607a025c6a4	dev2	$2b$10$0MWdeJRib8JfHfKJLr.pNuDhOZB/gBVqV8uolis0zWml4Gj36QK4C	Nia (Devcore 1)	dev2@kopnus.com	2	t	2026-07-26 16:23:28.031591+00	2026-07-26 16:23:28.031591+00
afdc4d03-8e31-4623-aa9c-62a728e6e7d2	dev1	$2b$10$0MWdeJRib8JfHfKJLr.pNuDhOZB/gBVqV8uolis0zWml4Gj36QK4C	Galih (Devcore 3)	dev1@kopnus.com	2	t	2026-07-26 16:23:28.028287+00	2026-07-26 16:23:28.028287+00
\.


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 2, true);


--
-- Name: attachments attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_pkey PRIMARY KEY (id);


--
-- Name: bug_comments bug_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bug_comments
    ADD CONSTRAINT bug_comments_pkey PRIMARY KEY (id);


--
-- Name: bug_daily_counter bug_daily_counter_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bug_daily_counter
    ADD CONSTRAINT bug_daily_counter_pkey PRIMARY KEY (counter_date);


--
-- Name: bug_status_history bug_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bug_status_history
    ADD CONSTRAINT bug_status_history_pkey PRIMARY KEY (id);


--
-- Name: bug_status_transitions bug_status_transitions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bug_status_transitions
    ADD CONSTRAINT bug_status_transitions_pkey PRIMARY KEY (from_status, to_status, allowed_role);


--
-- Name: bugs bugs_bug_no_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bugs
    ADD CONSTRAINT bugs_bug_no_key UNIQUE (bug_no);


--
-- Name: bugs bugs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bugs
    ADD CONSTRAINT bugs_pkey PRIMARY KEY (id);


--
-- Name: roles roles_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_code_key UNIQUE (code);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: test_case_daily_counter test_case_daily_counter_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_case_daily_counter
    ADD CONSTRAINT test_case_daily_counter_pkey PRIMARY KEY (counter_date);


--
-- Name: test_case_headers test_case_headers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_case_headers
    ADD CONSTRAINT test_case_headers_pkey PRIMARY KEY (id);


--
-- Name: test_case_items test_case_items_case_no_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_case_items
    ADD CONSTRAINT test_case_items_case_no_key UNIQUE (case_no);


--
-- Name: test_case_items test_case_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_case_items
    ADD CONSTRAINT test_case_items_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_attachments_owner; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attachments_owner ON public.attachments USING btree (attachable_type, attachable_id);


--
-- Name: idx_bugs_assigned; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bugs_assigned ON public.bugs USING btree (assigned_to);


--
-- Name: idx_bugs_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bugs_status ON public.bugs USING btree (status);


--
-- Name: idx_bugs_test_case; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bugs_test_case ON public.bugs USING btree (test_case_item_id);


--
-- Name: idx_tci_header; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tci_header ON public.test_case_items USING btree (header_id);


--
-- Name: idx_tci_pic_qa; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tci_pic_qa ON public.test_case_items USING btree (pic_qa);


--
-- Name: idx_tci_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tci_status ON public.test_case_items USING btree (status);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role_id);


--
-- Name: bugs trg_bug_created_log; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_bug_created_log AFTER INSERT ON public.bugs FOR EACH ROW EXECUTE FUNCTION public.fn_log_bug_created();


--
-- Name: bugs trg_bug_no; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_bug_no BEFORE INSERT ON public.bugs FOR EACH ROW EXECUTE FUNCTION public.fn_before_insert_bug();


--
-- Name: bugs trg_bug_status_log; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_bug_status_log BEFORE UPDATE ON public.bugs FOR EACH ROW EXECUTE FUNCTION public.fn_log_bug_status_change();


--
-- Name: test_case_headers trg_set_header_code; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_set_header_code BEFORE INSERT ON public.test_case_headers FOR EACH ROW EXECUTE FUNCTION public.fn_set_header_code();


--
-- Name: test_case_items trg_test_case_item_seq; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_test_case_item_seq BEFORE INSERT ON public.test_case_items FOR EACH ROW EXECUTE FUNCTION public.fn_before_insert_test_case_item();


--
-- Name: attachments attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: bug_comments bug_comments_bug_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bug_comments
    ADD CONSTRAINT bug_comments_bug_id_fkey FOREIGN KEY (bug_id) REFERENCES public.bugs(id) ON DELETE CASCADE;


--
-- Name: bug_comments bug_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bug_comments
    ADD CONSTRAINT bug_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: bug_status_history bug_status_history_bug_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bug_status_history
    ADD CONSTRAINT bug_status_history_bug_id_fkey FOREIGN KEY (bug_id) REFERENCES public.bugs(id) ON DELETE CASCADE;


--
-- Name: bug_status_history bug_status_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bug_status_history
    ADD CONSTRAINT bug_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id);


--
-- Name: bugs bugs_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bugs
    ADD CONSTRAINT bugs_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: bugs bugs_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bugs
    ADD CONSTRAINT bugs_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.users(id);


--
-- Name: bugs bugs_test_case_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bugs
    ADD CONSTRAINT bugs_test_case_item_id_fkey FOREIGN KEY (test_case_item_id) REFERENCES public.test_case_items(id) ON DELETE SET NULL;


--
-- Name: bugs bugs_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bugs
    ADD CONSTRAINT bugs_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: test_case_headers test_case_headers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_case_headers
    ADD CONSTRAINT test_case_headers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: test_case_items test_case_items_header_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_case_items
    ADD CONSTRAINT test_case_items_header_id_fkey FOREIGN KEY (header_id) REFERENCES public.test_case_headers(id) ON DELETE CASCADE;


--
-- Name: test_case_items test_case_items_pic_dev_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_case_items
    ADD CONSTRAINT test_case_items_pic_dev_fkey FOREIGN KEY (pic_dev) REFERENCES public.users(id);


--
-- Name: test_case_items test_case_items_pic_qa_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test_case_items
    ADD CONSTRAINT test_case_items_pic_qa_fkey FOREIGN KEY (pic_qa) REFERENCES public.users(id);


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- PostgreSQL database dump complete
--

\unrestrict ThxPQRGcD8WmUkAsIb5eJM9rrgSUevrOUDOarUx4RmDpdGG19xGAj9KgB7wLosd

