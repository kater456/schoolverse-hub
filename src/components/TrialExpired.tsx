import { AlertTriangle, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const TrialExpired = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Free Trial Expired</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            Your 7-day free trial has ended. To continue using EduMarket, please
            make a payment to activate your subscription.
          </p>

          <div className="rounded-lg border bg-muted/50 p-4 text-left space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <CreditCard className="h-4 w-4" />
              Payment Details
            </div>
            <p className="text-sm text-muted-foreground">
              Transfer to: <span className="font-mono font-semibold text-foreground">9016103308</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Bank: <span className="font-semibold text-foreground">Opay</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Name: <span className="font-semibold text-foreground">Kater</span>
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            After making payment, contact support so we can activate your account.
          </p>

          <div className="flex flex-col gap-2 pt-2">
            <Button variant="outline" onClick={() => navigate("/help")}>
              Contact Support
            </Button>
            <Button variant="ghost" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrialExpired;
