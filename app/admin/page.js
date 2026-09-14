import { isAdminRequest } from "@/lib/adminAuth";
import AdminLogin from "@/components/AdminLogin";
import AdminDashboard from "@/components/AdminDashboard";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return isAdminRequest() ? <AdminDashboard /> : <AdminLogin />;
}
