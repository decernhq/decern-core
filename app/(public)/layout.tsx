import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/navbar";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-white">
      <Navbar user={user} />
      {children}
    </div>
  );
}
