import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/enhanced-button";
import { ArrowLeft, DollarSign, TrendingUp, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { useToast } from "@/hooks/use-toast";
import Withdrawal from "@/components/ui/withdrawal";
import ResponsivePaymentModal from "@/components/ui/modal";

interface EarningsData {
  date: string;
  earnings: number;
  trips: number;
}

const DriverEarnings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [dailyData, setDailyData] = useState<EarningsData[]>([]);
  const [weeklyData, setWeeklyData] = useState<EarningsData[]>([]);
  const [monthlyData, setMonthlyData] = useState<EarningsData[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalTrips, setTotalTrips] = useState(0);
  const [verification, setVerification] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    avatarUrl: "",
    gender: "",
  });

  const [showWithdrawal, setShowWithdrawal] = useState(false);


  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }
      setUser(session.user);
    };
    checkUser();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchEarnings = async () => {
      const { data, error } = await supabase
        .from("deliveries")
        .select("*")
        .eq("driver_id", user.id)
        .eq("status", "delivered");

      if (error) {
        console.error("Error fetching earnings:", error);
        toast({
          title: "Error",
          description: "Failed to load earnings data",
          variant: "destructive",
        });
        return;
      }

      // Calculate total earnings and trips
      const total = data.reduce((sum, d) => sum + Number(d.price), 0);
      setTotalEarnings(total);
      setTotalTrips(data.length);

      // Process daily data (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();

      const daily = last7Days.map(date => {
        const dayData = data.filter(d => d.delivered_at?.startsWith(date));
        return {
          date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
          earnings: dayData.reduce((sum, d) => sum + Number(d.price), 0),
          trips: dayData.length,
        };
      });
      setDailyData(daily);

      // Process weekly data (last 4 weeks)
      const last4Weeks = Array.from({ length: 4 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (i * 7));
        return date;
      }).reverse();

      const weekly = last4Weeks.map((weekStart, index) => {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        const weekData = data.filter(d => {
          const deliveryDate = new Date(d.delivered_at || '');
          return deliveryDate >= weekStart && deliveryDate < weekEnd;
        });
        return {
          date: `Week ${index + 1}`,
          earnings: weekData.reduce((sum, d) => sum + Number(d.price), 0),
          trips: weekData.length,
        };
      });
      setWeeklyData(weekly);

      // Process monthly data (last 6 months)
      const last6Months = Array.from({ length: 6 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        return date;
      }).reverse();

      const monthly = last6Months.map(month => {
        const monthData = data.filter(d => {
          const deliveryDate = new Date(d.delivered_at || '');
          return deliveryDate.getMonth() === month.getMonth() &&
                 deliveryDate.getFullYear() === month.getFullYear();
        });
        return {
          date: month.toLocaleDateString('en-US', { month: 'short' }),
          earnings: monthData.reduce((sum, d) => sum + Number(d.price), 0),
          trips: monthData.length,
        };
      });
      setMonthlyData(monthly);

      const { data: verificationData } = await supabase
      .from("driver_verifications")
      .select("verification_status")
      .eq("user_id", user.id)
      .single();

      setVerification(verificationData);

      // Get user role
      const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();

      setUserRole(roleData?.role || null);
      

      // Get profile data
      const { data: profileData, error: profileError } = await supabase.from("profiles").select("first_name, last_name, phone, avatar_url, gender, created_at").eq("id", user.id).single();

      if (profileError) throw error;

      setProfile({
        firstName: profileData.first_name || "",
        lastName: profileData.last_name || "",
        email: user.email || "",
        phone: profileData.phone || "",
        avatarUrl: profileData.avatar_url || "",
        gender: profileData.gender || "",
      });
        
    };

    fetchEarnings();

  }, [user, toast]);
   const isVerified = verification === "approved";
   function withdraw() {
    // if (!isVerified) {
    //   navigate("/driver/verification");  
  

    setShowWithdrawal(true);
  

    
   }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/driver/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <h1 className="text-3xl font-bold mb-2">Earnings Analytics</h1>
              <p className="text-muted-foreground">Track your performance and earnings</p>
            </div>
            <div>
              <Button onClick={withdraw}>Withdraw</Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="shadow-medium">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalEarnings.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>

            <Card className="shadow-medium">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Trips</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalTrips}</div>
                <p className="text-xs text-muted-foreground">Completed deliveries</p>
              </CardContent>
            </Card>

            <Card className="shadow-medium">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg per Trip</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${totalTrips > 0 ? (totalEarnings / totalTrips).toFixed(2) : '0.00'}
                </div>
                <p className="text-xs text-muted-foreground">Average earnings</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle>Earnings Over Time</CardTitle>
              <CardDescription>View your earnings by day, week, or month</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="daily" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="daily">Daily</TabsTrigger>
                  <TabsTrigger value="weekly">Weekly</TabsTrigger>
                  <TabsTrigger value="monthly">Monthly</TabsTrigger>
                </TabsList>
                
                <TabsContent value="daily" className="pt-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="earnings" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </TabsContent>
                
                <TabsContent value="weekly" className="pt-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="earnings" stroke="hsl(var(--primary))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </TabsContent>
                
                <TabsContent value="monthly" className="pt-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="earnings" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Trips Chart */}
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle>Trip Volume</CardTitle>
              <CardDescription>Number of completed trips over time</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="daily" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="daily">Daily</TabsTrigger>
                  <TabsTrigger value="weekly">Weekly</TabsTrigger>
                  <TabsTrigger value="monthly">Monthly</TabsTrigger>
                </TabsList>
                
                <TabsContent value="daily" className="pt-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="trips" stroke="hsl(var(--secondary))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </TabsContent>
                
                <TabsContent value="weekly" className="pt-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="trips" fill="hsl(var(--secondary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </TabsContent>
                
                <TabsContent value="monthly" className="pt-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="trips" stroke="hsl(var(--secondary))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
           <ResponsivePaymentModal
        isOpen={showWithdrawal}
        onClose={() => setShowWithdrawal(false)}
        title="Withdraw Funds"
      >
        <Withdrawal
          role="driver"
          balance="250.00"
        />
      </ResponsivePaymentModal>
  
      </main>
    </div>
  );
};

export default DriverEarnings;
