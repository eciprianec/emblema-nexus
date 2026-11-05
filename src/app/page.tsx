import { redirect } from "next/navigation";

// Sin sesión, el middleware ya envía a /login antes de llegar aquí.
export default function Home() {
  redirect("/dashboard");
}
