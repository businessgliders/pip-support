import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Ticket, XCircle, Heart, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import UserSelectionScreen from "../components/support/UserSelectionScreen";
import KpiCard from "../components/analytics/KpiCard";
import TicketsTrendChart from "../components/analytics/TicketsTrendChart";
import CancellationReasonsChart from "../components/analytics/CancellationReasonsChart";
import RepeatClientsTable from "../components/analytics/RepeatClientsTable";
import {
  computeKpis,
  computeMonthlyTrend,
  computeCancellationReasons,
  computeRepeatClients,
} from "@/lib/analyticsHelpers";

export default function Analytics() {
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (!currentUser.email.endsWith("@pilatesinpinkstudio.com")) {
          setUser(null);
        } else {
          setUser(currentUser);
        }
      } catch {
        setUser(null);
      } finally {
        setIsAuthLoading(false);
      }
    };
    checkAuth();
  }, []);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["support-tickets-analytics"],
    queryFn: () => base44.entities.SupportTicket.list("-created_date", 1000),
    enabled: !!user,
  });

  const kpis = useMemo(() => computeKpis(tickets), [tickets]);
  const trend = useMemo(() => computeMonthlyTrend(tickets), [tickets]);
  const reasons = useMemo(() => computeCancellationReasons(tickets), [tickets]);
  const repeatClients = useMemo(() => computeRepeatClients(tickets), [tickets]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f1899b] via-[#f7b1bd] to-[#fbe0e2]">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) return <UserSelectionScreen />;

  const formatHours = (h) => {
    if (h < 1) return `${Math.round(h * 60)}m`;
    if (h < 24) return `${h.toFixed(1)}h`;
    return `${(h / 24).toFixed(1)}d`;
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-b from-[#f1899b] to-white relative overflow-y-auto">
      <div className="absolute top-0 left-0 w-96 h-96 bg-white/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-100/40 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button
            onClick={() => navigate("/TicketBoard")}
            variant="ghost"
            className="backdrop-blur-md bg-white/30 hover:bg-white/50 border border-white/40 text-white rounded-xl"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">Analytics</h1>
        </div>

        {isLoading ? (
          <div className="text-white text-lg">Loading data...</div>
        ) : (
          <>
            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
              <KpiCard
                label="Tickets This Month"
                value={kpis.totalThisMonth}
                change={kpis.monthChange}
                sublabel="vs last month"
                icon={Ticket}
                accent="#f1899b"
              />
              <KpiCard
                label="Cancellation Ratio"
                value={`${kpis.cancellationRatio.toFixed(1)}%`}
                sublabel={`${kpis.cancellationCount} total`}
                icon={XCircle}
                accent="#dc2626"
              />
              <KpiCard
                label="Retention Rate"
                value={`${kpis.retentionRate.toFixed(0)}%`}
                sublabel={`${kpis.acceptedDiscounts} saved`}
                icon={Heart}
                accent="#16a34a"
              />
              <KpiCard
                label="Avg Resolution"
                value={formatHours(kpis.avgResolutionHours)}
                sublabel="created → closed"
                icon={Clock}
                accent="#b67651"
              />
              <KpiCard
                label="Oldest Open"
                value={`${kpis.oldestOpenDays}d`}
                sublabel={`${kpis.openCount} open tickets`}
                icon={AlertCircle}
                accent="#f59e0b"
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
              <TicketsTrendChart data={trend} />
              <CancellationReasonsChart data={reasons} />
            </div>

            {/* Repeat Clients */}
            <RepeatClientsTable clients={repeatClients} />
          </>
        )}
      </div>
    </div>
  );
}