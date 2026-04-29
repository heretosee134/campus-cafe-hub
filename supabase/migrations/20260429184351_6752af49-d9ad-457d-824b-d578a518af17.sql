-- =========================================================
-- Campus Café — schema, roles, RLS, triggers, seed data
-- =========================================================

-- ENUMS
CREATE TYPE public.app_role AS ENUM ('student', 'staff', 'cafe_staff', 'admin');
CREATE TYPE public.menu_category AS ENUM ('drink', 'snack', 'meal', 'dessert');
CREATE TYPE public.availability_status AS ENUM ('available', 'out_of_stock');
CREATE TYPE public.order_status AS ENUM ('pending', 'preparing', 'ready', 'collected', 'cancelled');
CREATE TYPE public.notification_status AS ENUM ('sent', 'unread', 'read');
CREATE TYPE public.complaint_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- =========================================================
-- profiles
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- user_roles  (separate table — required for security)
-- =========================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- security definer role check
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- =========================================================
-- menu_item
-- =========================================================
CREATE TABLE public.menu_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL UNIQUE,
  description TEXT,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  availability_status public.availability_status NOT NULL DEFAULT 'available',
  category public.menu_category NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.menu_item ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- inventory
-- =========================================================
CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL UNIQUE REFERENCES public.menu_item(id) ON DELETE CASCADE,
  quantity_in_stock INT NOT NULL CHECK (quantity_in_stock >= 0),
  reorder_level INT NOT NULL CHECK (reorder_level >= 0),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- orders
-- =========================================================
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
  order_status public.order_status NOT NULL DEFAULT 'pending',
  pickup_time TIMESTAMPTZ
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.orders(user_id);

-- =========================================================
-- order_item
-- =========================================================
CREATE TABLE public.order_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.menu_item(id),
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  special_instructions TEXT,
  UNIQUE (order_id, item_id)
);
ALTER TABLE public.order_item ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- notification
-- =========================================================
CREATE TABLE public.notification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  sent_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  status public.notification_status NOT NULL DEFAULT 'unread'
);
ALTER TABLE public.notification ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- complaint
-- =========================================================
CREATE TABLE public.complaint (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  complaint_text TEXT NOT NULL,
  complaint_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  complaint_status public.complaint_status NOT NULL DEFAULT 'open'
);
ALTER TABLE public.complaint ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- review
-- =========================================================
CREATE TABLE public.review (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.menu_item(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  review_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_id)
);
ALTER TABLE public.review ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- RLS POLICIES
-- =========================================================

-- profiles
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'cafe_staff'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins manage profiles" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- user_roles
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- menu_item
CREATE POLICY "Anyone authenticated can view menu" ON public.menu_item FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage menu" ON public.menu_item FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- inventory
CREATE POLICY "Staff view inventory" ON public.inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage inventory" ON public.inventory FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'cafe_staff')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'cafe_staff'));

-- orders
CREATE POLICY "Users view own orders" ON public.orders FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'cafe_staff'));
CREATE POLICY "Users create own orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users cancel own pending orders" ON public.orders FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'cafe_staff'));
CREATE POLICY "Admins delete orders" ON public.orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- order_item
CREATE POLICY "Users view own order items" ON public.order_item FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'cafe_staff')))
);
CREATE POLICY "Users insert own order items" ON public.order_item FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
);
CREATE POLICY "Admins manage order items" ON public.order_item FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- notification
CREATE POLICY "Users view own notifications" ON public.notification FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notification FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Staff create notifications" ON public.notification FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'cafe_staff') OR user_id = auth.uid());

-- complaint
CREATE POLICY "Users view own complaints" ON public.complaint FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users create own complaints" ON public.complaint FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins manage complaints" ON public.complaint FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- review
CREATE POLICY "Anyone authenticated views reviews" ON public.review FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create own reviews" ON public.review FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own reviews" ON public.review FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users delete own reviews" ON public.review FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- =========================================================
-- TRIGGERS
-- =========================================================

-- auto-create profile + default 'student' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone_number)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email,'@',1)),
    NEW.email,
    NEW.raw_user_meta_data ->> 'phone_number'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- inventory last_updated trigger
CREATE OR REPLACE FUNCTION public.touch_inventory_updated()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER inventory_touch BEFORE UPDATE ON public.inventory
FOR EACH ROW EXECUTE FUNCTION public.touch_inventory_updated();