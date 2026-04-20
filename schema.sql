\restrict VPBfyDh2MtFUkNVr7gL9bQNelHH5AwuN5cSMJm8e7bkd0zi9vuWH87thh9To93q

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

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';

CREATE TYPE public.orders_status_enum AS ENUM (
    'PENDING',
    'CONFIRMED',
    'CANCELLED'
);

ALTER TYPE public.orders_status_enum OWNER TO neondb_owner;

CREATE TYPE public.payments_method_enum AS ENUM (
    'CASH',
    'UPI',
    'CARD',
    'BANK_TRANSFER'
);

ALTER TYPE public.payments_method_enum OWNER TO neondb_owner;

CREATE TYPE public.payments_status_enum AS ENUM (
    'PENDING',
    'COMPLETED',
    'FAILED',
    'REFUNDED'
);

ALTER TYPE public.payments_status_enum OWNER TO neondb_owner;

CREATE TYPE public.plans_name_enum AS ENUM (
    'BASIC',
    'STANDARD',
    'PREMIUM'
);

ALTER TYPE public.plans_name_enum OWNER TO neondb_owner;

CREATE TYPE public.plant_variants_size_enum AS ENUM (
    'TINY',
    'SMALL',
    'MEDIUM',
    'LARGE',
    'EXTRA_LARGE'
);

ALTER TYPE public.plant_variants_size_enum OWNER TO neondb_owner;

CREATE TYPE public.stock_logs_type_enum AS ENUM (
    'IN',
    'OUT',
    'DEAD',
    'ADJUST'
);

ALTER TYPE public.stock_logs_type_enum OWNER TO neondb_owner;

CREATE TYPE public.subscriptions_status_enum AS ENUM (
    'ACTIVE',
    'EXPIRED',
    'CANCELLED'
);

ALTER TYPE public.subscriptions_status_enum OWNER TO neondb_owner;

CREATE TYPE public.users_role_enum AS ENUM (
    'owner',
    'manager',
    'staff'
);

ALTER TYPE public.users_role_enum OWNER TO neondb_owner;

SET default_tablespace = '';

SET default_table_access_method = heap;

CREATE TABLE public.business_types (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.business_types OWNER TO neondb_owner;

CREATE SEQUENCE public.business_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.business_types_id_seq OWNER TO neondb_owner;

ALTER SEQUENCE public.business_types_id_seq OWNED BY public.business_types.id;

CREATE TABLE public.cart (
    id integer NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    variant_id integer NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.cart OWNER TO neondb_owner;

CREATE SEQUENCE public.cart_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.cart_id_seq OWNER TO neondb_owner;

ALTER SEQUENCE public.cart_id_seq OWNED BY public.cart.id;

CREATE TABLE public.categories (
    id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    description character varying,
    status boolean DEFAULT true NOT NULL,
    organization_id uuid,
    name character varying
);

ALTER TABLE public.categories OWNER TO neondb_owner;

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.categories_id_seq OWNER TO neondb_owner;

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;

CREATE TABLE public.menu_master (
    id integer NOT NULL,
    "menuName" character varying(255) NOT NULL,
    path character varying(500),
    parent_id integer,
    icon character varying(100),
    display_order integer DEFAULT 0 NOT NULL,
    is_visible boolean DEFAULT true NOT NULL,
    status boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    organization_id uuid
);

ALTER TABLE public.menu_master OWNER TO neondb_owner;

CREATE SEQUENCE public.menu_master_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.menu_master_id_seq OWNER TO neondb_owner;

ALTER SEQUENCE public.menu_master_id_seq OWNED BY public.menu_master.id;

CREATE TABLE public.order_items (
    id integer NOT NULL,
    order_id integer NOT NULL,
    variant_id integer NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL
);

ALTER TABLE public.order_items OWNER TO neondb_owner;

CREATE SEQUENCE public.order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.order_items_id_seq OWNER TO neondb_owner;

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;

CREATE TABLE public.orders (
    id integer NOT NULL,
    organization_id uuid NOT NULL,
    customer_name character varying(150),
    customer_phone character varying(25),
    status public.orders_status_enum DEFAULT 'PENDING'::public.orders_status_enum NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.orders OWNER TO neondb_owner;

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.orders_id_seq OWNER TO neondb_owner;

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;

CREATE TABLE public.organizations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(191) NOT NULL,
    phone character varying(25) NOT NULL,
    address character varying(255) NOT NULL,
    organization_name character varying(150) NOT NULL,
    logo_url character varying(500),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.organizations OWNER TO neondb_owner;

CREATE TABLE public.payments (
    id integer NOT NULL,
    order_id integer NOT NULL,
    organization_id uuid NOT NULL,
    method public.payments_method_enum NOT NULL,
    status public.payments_status_enum DEFAULT 'PENDING'::public.payments_status_enum NOT NULL,
    amount numeric(10,2) NOT NULL,
    reference_number character varying(100),
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    invoice_url text
);

ALTER TABLE public.payments OWNER TO neondb_owner;

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.payments_id_seq OWNER TO neondb_owner;

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;

CREATE TABLE public.plans (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name public.plans_name_enum NOT NULL,
    price numeric(10,2) NOT NULL,
    features json NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.plans OWNER TO neondb_owner;

CREATE TABLE public.plant_stock (
    id integer NOT NULL,
    "variantId" integer NOT NULL,
    "organizationId" uuid NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT "CHK_plant_stock_quantity_non_negative" CHECK ((quantity >= 0))
);

ALTER TABLE public.plant_stock OWNER TO neondb_owner;

CREATE SEQUENCE public.plant_stock_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.plant_stock_id_seq OWNER TO neondb_owner;

ALTER SEQUENCE public.plant_stock_id_seq OWNED BY public.plant_stock.id;

CREATE TABLE public.plant_variants (
    id integer NOT NULL,
    "plantId" integer NOT NULL,
    "organizationId" uuid,
    size public.plant_variants_size_enum DEFAULT 'MEDIUM'::public.plant_variants_size_enum NOT NULL,
    price numeric(10,2) NOT NULL,
    sku character varying(100) NOT NULL,
    quantity numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    "minQuantity" numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    barcode character varying,
    status boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.plant_variants OWNER TO neondb_owner;

CREATE SEQUENCE public.plant_variants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.plant_variants_id_seq OWNER TO neondb_owner;

ALTER SEQUENCE public.plant_variants_id_seq OWNED BY public.plant_variants.id;

CREATE TABLE public.plants (
    id integer NOT NULL,
    status boolean DEFAULT true NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    season character varying(50),
    sku character varying(100),
    image_url character varying NOT NULL,
    care_instructions text,
    qr_code_url character varying,
    category_id integer NOT NULL,
    subcategory_id integer NOT NULL,
    organization_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.plants OWNER TO neondb_owner;

CREATE SEQUENCE public.plants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.plants_id_seq OWNER TO neondb_owner;

ALTER SEQUENCE public.plants_id_seq OWNED BY public.plants.id;

CREATE TABLE public.qr_codes (
    id integer NOT NULL,
    code character varying(100) NOT NULL,
    plant_id integer NOT NULL,
    organization_id uuid NOT NULL,
    qr_image_base64 text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.qr_codes OWNER TO neondb_owner;

CREATE SEQUENCE public.qr_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.qr_codes_id_seq OWNER TO neondb_owner;

ALTER SEQUENCE public.qr_codes_id_seq OWNED BY public.qr_codes.id;

CREATE TABLE public.registration_categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    status boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.registration_categories OWNER TO neondb_owner;

CREATE TABLE public.registration_subcategories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    category_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.registration_subcategories OWNER TO neondb_owner;

CREATE SEQUENCE public.registration_subcategories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.registration_subcategories_id_seq OWNER TO neondb_owner;

ALTER SEQUENCE public.registration_subcategories_id_seq OWNED BY public.registration_subcategories.id;

CREATE TABLE public.request_logs (
    id integer NOT NULL,
    method character varying(10) NOT NULL,
    endpoint character varying(500) NOT NULL,
    "userId" character varying(100),
    ip character varying(50),
    "statusCode" integer NOT NULL,
    "durationMs" integer,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.request_logs OWNER TO neondb_owner;

CREATE SEQUENCE public.request_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.request_logs_id_seq OWNER TO neondb_owner;

ALTER SEQUENCE public.request_logs_id_seq OWNED BY public.request_logs.id;

CREATE TABLE public.stock_logs (
    id integer NOT NULL,
    "variantId" integer NOT NULL,
    "organizationId" uuid NOT NULL,
    type public.stock_logs_type_enum NOT NULL,
    quantity integer NOT NULL,
    reference character varying(255),
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT "CHK_stock_logs_quantity_non_negative" CHECK ((quantity >= 0))
);

ALTER TABLE public.stock_logs OWNER TO neondb_owner;

CREATE SEQUENCE public.stock_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.stock_logs_id_seq OWNER TO neondb_owner;

ALTER SEQUENCE public.stock_logs_id_seq OWNED BY public.stock_logs.id;

CREATE TABLE public.subcategories (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    category_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    organization_id uuid
);

ALTER TABLE public.subcategories OWNER TO neondb_owner;

CREATE SEQUENCE public.subcategories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.subcategories_id_seq OWNER TO neondb_owner;

ALTER SEQUENCE public.subcategories_id_seq OWNED BY public.subcategories.id;

CREATE TABLE public.subscriptions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "organizationId" uuid NOT NULL,
    "planId" uuid NOT NULL,
    "startDate" timestamp with time zone NOT NULL,
    "endDate" timestamp with time zone NOT NULL,
    status public.subscriptions_status_enum DEFAULT 'ACTIVE'::public.subscriptions_status_enum NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.subscriptions OWNER TO neondb_owner;

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying NOT NULL,
    "passwordHash" character varying NOT NULL,
    role public.users_role_enum DEFAULT 'owner'::public.users_role_enum NOT NULL,
    "organizationId" uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    name character varying
);

ALTER TABLE public.users OWNER TO neondb_owner;

ALTER TABLE ONLY public.business_types ALTER COLUMN id SET DEFAULT nextval('public.business_types_id_seq'::regclass);

ALTER TABLE ONLY public.cart ALTER COLUMN id SET DEFAULT nextval('public.cart_id_seq'::regclass);

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);

ALTER TABLE ONLY public.menu_master ALTER COLUMN id SET DEFAULT nextval('public.menu_master_id_seq'::regclass);

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);

ALTER TABLE ONLY public.plant_stock ALTER COLUMN id SET DEFAULT nextval('public.plant_stock_id_seq'::regclass);

ALTER TABLE ONLY public.plant_variants ALTER COLUMN id SET DEFAULT nextval('public.plant_variants_id_seq'::regclass);

ALTER TABLE ONLY public.plants ALTER COLUMN id SET DEFAULT nextval('public.plants_id_seq'::regclass);

ALTER TABLE ONLY public.qr_codes ALTER COLUMN id SET DEFAULT nextval('public.qr_codes_id_seq'::regclass);

ALTER TABLE ONLY public.registration_subcategories ALTER COLUMN id SET DEFAULT nextval('public.registration_subcategories_id_seq'::regclass);

ALTER TABLE ONLY public.request_logs ALTER COLUMN id SET DEFAULT nextval('public.request_logs_id_seq'::regclass);

ALTER TABLE ONLY public.stock_logs ALTER COLUMN id SET DEFAULT nextval('public.stock_logs_id_seq'::regclass);

ALTER TABLE ONLY public.subcategories ALTER COLUMN id SET DEFAULT nextval('public.subcategories_id_seq'::regclass);

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT "PK_005269d8574e6fac0493715c308" PRIMARY KEY (id);

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY (id);

ALTER TABLE ONLY public.request_logs
    ADD CONSTRAINT "PK_1edd3815ae37a9b9511f5a26dca" PRIMARY KEY (id);

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY (id);

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT "PK_3720521a81c7c24fe9b7202ba61" PRIMARY KEY (id);

ALTER TABLE ONLY public.business_types
    ADD CONSTRAINT "PK_3c34c2b0b96fd7d13d7b4750b27" PRIMARY KEY (id);

ALTER TABLE ONLY public.qr_codes
    ADD CONSTRAINT "PK_4b7aa338e150a878ce9e2c55c5c" PRIMARY KEY (id);

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT "PK_6b031fcd0863e3f6b44230163f9" PRIMARY KEY (id);

ALTER TABLE ONLY public.plants
    ADD CONSTRAINT "PK_7056d6b283b48ee2bb0e53bee60" PRIMARY KEY (id);

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY (id);

ALTER TABLE ONLY public.stock_logs
    ADD CONSTRAINT "PK_73f00c7a7857bcc54d63409aedd" PRIMARY KEY (id);

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT "PK_793ef34ad0a3f86f09d4837007c" PRIMARY KEY (id);

ALTER TABLE ONLY public.plant_stock
    ADD CONSTRAINT "PK_7d6f32b233443f142bc261dd27e" PRIMARY KEY (id);

ALTER TABLE ONLY public.registration_categories
    ADD CONSTRAINT "PK_7d76aa0649286cb07c58f38190f" PRIMARY KEY (id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT "PK_a87248d73155605cf782be9ee5e" PRIMARY KEY (id);

ALTER TABLE ONLY public.plant_variants
    ADD CONSTRAINT "PK_b97ae1fe37996ac63730a39c4e7" PRIMARY KEY (id);

ALTER TABLE ONLY public.cart
    ADD CONSTRAINT "PK_c524ec48751b9b5bcfbf6e59be7" PRIMARY KEY (id);

ALTER TABLE ONLY public.registration_subcategories
    ADD CONSTRAINT "PK_f53522bedc8319887ec2607acac" PRIMARY KEY (id);

ALTER TABLE ONLY public.plant_stock
    ADD CONSTRAINT "REL_4a80c08d75a928eb781f844458" UNIQUE ("variantId");

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "REL_b2f7b823a21562eeca20e72b00" UNIQUE (order_id);

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT "UQ_253d25dae4c94ee913bc5ec4850" UNIQUE (name);

ALTER TABLE ONLY public.business_types
    ADD CONSTRAINT "UQ_3894005288e759379ee7b56622a" UNIQUE (name);

ALTER TABLE ONLY public.cart
    ADD CONSTRAINT "UQ_450a47a769ef012e6e22f22ab7b" UNIQUE (user_id, variant_id);

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT "UQ_4ad920935f4d4eb73fc58b40f72" UNIQUE (email);

ALTER TABLE ONLY public.qr_codes
    ADD CONSTRAINT "UQ_8a8ba2310839f388674c1b095c8" UNIQUE (code);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email);

ALTER TABLE ONLY public.plant_variants
    ADD CONSTRAINT "UQ_organization_sku" UNIQUE ("organizationId", sku);

ALTER TABLE ONLY public.plant_stock
    ADD CONSTRAINT "UQ_plant_stock_organization_variant" UNIQUE ("organizationId", "variantId");

ALTER TABLE ONLY public.menu_master
    ADD CONSTRAINT menu_master_pkey PRIMARY KEY (id);

CREATE INDEX "IDX_2801ac1037d4e60c5ab8eed324" ON public.plants USING btree (category_id);

CREATE INDEX "IDX_2e8d84993cb34b5ae22b23abec" ON public.plants USING btree (organization_id);

CREATE INDEX "IDX_3b13df1eb3b062fd5ed4ebc53b" ON public.orders USING btree (organization_id);

CREATE INDEX "IDX_775c9f06fc27ae3ff8fb26f2c4" ON public.orders USING btree (status);

CREATE UNIQUE INDEX "IDX_8a8ba2310839f388674c1b095c" ON public.qr_codes USING btree (code);

CREATE INDEX "IDX_8bc552c015fe206cdec5b3f146" ON public.plants USING btree (subcategory_id);

CREATE INDEX "IDX_8c08c84e8f84ed0a8e0ed94111" ON public.cart USING btree (user_id, organization_id);

CREATE INDEX "IDX_a7a84c705f3e8e4fbd497cfb11" ON public.subscriptions USING btree ("organizationId");

CREATE INDEX "IDX_b2c3f221643494755d8330e6e9" ON public.qr_codes USING btree (plant_id);

CREATE UNIQUE INDEX "IDX_b2f7b823a21562eeca20e72b00" ON public.payments USING btree (order_id);

CREATE INDEX "IDX_bb0a74456bb91ba1b3b7d511d1" ON public.plants USING btree (status);

CREATE INDEX "IDX_fc07ace491143726974991711f" ON public.payments USING btree (organization_id);

CREATE INDEX "idx_plant_stock_organizationId" ON public.plant_stock USING btree ("organizationId");

CREATE INDEX "idx_plant_stock_variantId" ON public.plant_stock USING btree ("variantId");

CREATE INDEX "idx_plant_variants_organizationId" ON public.plant_variants USING btree ("organizationId");

CREATE INDEX "idx_plant_variants_plantId" ON public.plant_variants USING btree ("plantId");

CREATE INDEX idx_plant_variants_status ON public.plant_variants USING btree (status);

CREATE INDEX "idx_request_logs_createdAt" ON public.request_logs USING btree ("createdAt");

CREATE INDEX "idx_request_logs_statusCode" ON public.request_logs USING btree ("statusCode");

CREATE INDEX "idx_request_logs_userId" ON public.request_logs USING btree ("userId");

CREATE INDEX "idx_stock_logs_createdAt" ON public.stock_logs USING btree ("createdAt");

CREATE INDEX "idx_stock_logs_organizationId" ON public.stock_logs USING btree ("organizationId");

CREATE INDEX "idx_stock_logs_variantId" ON public.stock_logs USING btree ("variantId");

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT "FK_145532db85752b29c57d2b7b1f1" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT "FK_209571bb4bff0ced52a590fba9f" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.plants
    ADD CONSTRAINT "FK_2801ac1037d4e60c5ab8eed3247" FOREIGN KEY (category_id) REFERENCES public.categories(id);

ALTER TABLE ONLY public.plants
    ADD CONSTRAINT "FK_2e8d84993cb34b5ae22b23abece" FOREIGN KEY (organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.plant_variants
    ADD CONSTRAINT "FK_31fac1515d03fc291267ea415f6" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id);

ALTER TABLE ONLY public.registration_subcategories
    ADD CONSTRAINT "FK_3c5b571da33d88ed1b8ea16e805" FOREIGN KEY (category_id) REFERENCES public.registration_categories(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.plant_stock
    ADD CONSTRAINT "FK_4a80c08d75a928eb781f8444586" FOREIGN KEY ("variantId") REFERENCES public.plant_variants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT "FK_7536cba909dd7584a4640cad7d5" FOREIGN KEY ("planId") REFERENCES public.plans(id);

ALTER TABLE ONLY public.menu_master
    ADD CONSTRAINT "FK_7566e1861d1408275cedd6fb059" FOREIGN KEY (parent_id) REFERENCES public.menu_master(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.cart
    ADD CONSTRAINT "FK_874daeacb720af61a290acdce0f" FOREIGN KEY (variant_id) REFERENCES public.plant_variants(id);

ALTER TABLE ONLY public.plants
    ADD CONSTRAINT "FK_8bc552c015fe206cdec5b3f146b" FOREIGN KEY (subcategory_id) REFERENCES public.subcategories(id);

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT "FK_a7a84c705f3e8e4fbd497cfb119" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.qr_codes
    ADD CONSTRAINT "FK_b2c3f221643494755d8330e6e91" FOREIGN KEY (plant_id) REFERENCES public.plants(id);

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "FK_b2f7b823a21562eeca20e72b006" FOREIGN KEY (order_id) REFERENCES public.orders(id);

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT "FK_bfac25cac85a4c76e896d5cfa16" FOREIGN KEY (organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.menu_master
    ADD CONSTRAINT "FK_d8ff80953e6cdcfa43557800fae" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT "FK_db2d0ea722e16e0fe8ab3bce111" FOREIGN KEY (variant_id) REFERENCES public.plant_variants(id);

ALTER TABLE ONLY public.stock_logs
    ADD CONSTRAINT "FK_de275d9968e8830bd41bcd8e5ce" FOREIGN KEY ("variantId") REFERENCES public.plant_variants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "FK_f3d6aea8fcca58182b2e80ce979" FOREIGN KEY ("organizationId") REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.plant_variants
    ADD CONSTRAINT "FK_f731c1ca3c3e1ebf9a6a0981bac" FOREIGN KEY ("plantId") REFERENCES public.plants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT "FK_f7b015bc580ae5179ba5a4f42ec" FOREIGN KEY (category_id) REFERENCES public.categories(id);

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;

@unrestrict VPBfyDh2MtFUkNVr7gL9bQNelHH5AwuN5cSMJm8e7bkd0zi9vuWH87thh9To93q
