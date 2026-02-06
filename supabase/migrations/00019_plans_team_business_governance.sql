-- Add new plan_id enum values. Must be in a separate migration: PostgreSQL does not
-- allow using a newly added enum value in the same transaction (55P04).
alter type plan_id add value if not exists 'team';
alter type plan_id add value if not exists 'business';
alter type plan_id add value if not exists 'governance';
