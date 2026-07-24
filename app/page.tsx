import { redirect } from "next/navigation";

// The product lives at /app. The marketing landing and the /pro research-partner
// page are parked on the `full-nautica` branch for a later push.
export default function Home() {
  redirect("/app");
}
