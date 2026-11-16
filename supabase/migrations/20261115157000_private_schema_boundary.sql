-- Policy expressions already bind the helper OID. They need EXECUTE on the
-- specific helper, not USAGE on the entire private namespace.
revoke usage on schema private from authenticated;
revoke execute on function private.is_admin() from authenticated;
