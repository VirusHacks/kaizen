import { onAuthenticateUser } from "@/actions/auth";
import { redirect } from "next/navigation";
import DashboardContent from "./_components/DashboardContent";

const DashboardPage = async () => {
  const checkUser = await onAuthenticateUser();
  if (!checkUser.user) {
    redirect("/sign-in");
  }

  return <DashboardContent />;
};

export default DashboardPage;

