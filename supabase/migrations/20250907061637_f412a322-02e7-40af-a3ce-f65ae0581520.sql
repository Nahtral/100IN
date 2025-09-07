-- Check for any views with SECURITY DEFINER
SELECT 
  schemaname, 
  viewname, 
  definition 
FROM pg_views 
WHERE definition ILIKE '%security definer%';