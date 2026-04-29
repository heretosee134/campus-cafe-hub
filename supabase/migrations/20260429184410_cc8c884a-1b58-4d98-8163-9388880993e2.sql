-- Fix function search paths (already set on has_role/handle_new_user, missing on touch_inventory_updated)
CREATE OR REPLACE FUNCTION public.touch_inventory_updated()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$;

-- Revoke execute from public/anon/authenticated; policies still work because
-- SECURITY DEFINER functions are evaluated with owner privileges inside the policy.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_inventory_updated() FROM PUBLIC, anon, authenticated;