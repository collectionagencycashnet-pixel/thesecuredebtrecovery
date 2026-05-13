## Supabase database configuration

In your Supabase project, go to the **SQL Editor** and run the following query to create the necessary table so your application connects seamlessly. This strictly matches the application state attributes and structure:

```sql
CREATE TABLE IF NOT EXISTS public.loan_applications (
    "id" TEXT PRIMARY KEY,
    "fullName" TEXT NOT NULL,
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

-- Note: In this MVP configuration, we are not applying RLS (Row Level Security) 
-- on this table automatically since we authenticate via a hardcoded dash.
-- But you MUST consider security best practices for production databases.
```

Once the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are placed in the secrets/variables of the environment, the application will automatically switch from LocalStorage to the real-time Supabase Database instance.
