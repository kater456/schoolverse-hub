import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Package, CheckCircle2, Clock, Truck, ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  vendorId: string;
}

interface PublicLedgerEntry {
  vendor_id: string;
  public_code: string;
  item_count: number;
  payment_status: "unpaid" | "paid" | string;
  delivery_status: "pending" | "delivered" | string;
  created_at: string;
  paid_at: string | null;
  delivered_at: string | null;
}

const PAGE_SIZE = 10;

export default function VendorPreorderLedger({ vendorId }: Props) {
  const [entries, setEntries] = useState<PublicLedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [metrics, setMetrics] = useState({
    total: 0,
    paid: 0,
    delivered: 0,
    pending: 0,
  });

  useEffect(() => {
    const fetchSummaryAndLedger = async () => {
      if (!vendorId) return;
      setIsLoading(true);

      try {
        // 1. Fetch summary stats from public_preorder_ledger
        const { data: allRows, error: summaryError } = await supabase
          .from("public_preorder_ledger")
          .select("payment_status, delivery_status")
          .eq("vendor_id", vendorId);

        if (summaryError) throw summaryError;

        if (allRows) {
          const total = allRows.length;
          const paid = allRows.filter((r) => r.payment_status === "paid").length;
          const delivered = allRows.filter((r) => r.delivery_status === "delivered").length;
          const pending = total - delivered;

          setMetrics({ total, paid, delivered, pending });
          setTotalCount(total);
        }

        // 2. Fetch paginated ledger entries
        const from = (page - 1) * PAGE_SIZE;
        const to = page * PAGE_SIZE - 1;

        const { data: paginatedRows, error: ledgerError } = await supabase
          .from("public_preorder_ledger")
          .select("*")
          .eq("vendor_id", vendorId)
          .order("created_at", { ascending: false })
          .range(from, to);

        if (ledgerError) throw ledgerError;

        setEntries((paginatedRows as PublicLedgerEntry[]) || []);
      } catch (err) {
        console.error("Error loading pre-order ledger:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummaryAndLedger();
  }, [vendorId, page]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-5">
      {/* Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/50 bg-card/60">
          <CardContent className="p-3 text-center">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Total Pre-Orders
            </p>
            <p className="text-xl font-bold text-foreground mt-0.5">{metrics.total}</p>
          </CardContent>
        </Card>

        <Card className="border-success/30 bg-success/5">
          <CardContent className="p-3 text-center">
            <p className="text-[11px] font-medium text-success uppercase tracking-wider">
              Paid
            </p>
            <p className="text-xl font-bold text-success mt-0.5">{metrics.paid}</p>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-3 text-center">
            <p className="text-[11px] font-medium text-primary uppercase tracking-wider">
              Delivered
            </p>
            <p className="text-xl font-bold text-primary mt-0.5">{metrics.delivered}</p>
          </CardContent>
        </Card>

        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-3 text-center">
            <p className="text-[11px] font-medium text-warning uppercase tracking-wider">
              Pending Fulfillment
            </p>
            <p className="text-xl font-bold text-warning mt-0.5">{metrics.pending}</p>
          </CardContent>
        </Card>
      </div>

      {/* Ledger Table / Cards */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Package className="h-4 w-4 text-accent" /> Public Pre-Order Ledger
            </h3>
            <span className="text-xs text-muted-foreground">Anonymous order log</span>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <Package className="h-8 w-8 text-muted-foreground/40 mx-auto" />
              <p className="text-sm font-medium text-foreground">No pre-orders recorded yet</p>
              <p className="text-xs text-muted-foreground">
                Public order records will show here as pre-orders are placed.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer ID</TableHead>
                      <TableHead className="text-center">Items</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Delivery</TableHead>
                      <TableHead>Ordered Date</TableHead>
                      <TableHead>Delivered Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((item) => (
                      <TableRow key={item.public_code}>
                        <TableCell className="font-mono text-xs font-bold text-foreground">
                          {item.public_code}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {item.item_count}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              item.payment_status === "paid"
                                ? "bg-success/20 text-success border-success/30 text-[11px]"
                                : "bg-warning/20 text-warning border-warning/30 text-[11px]"
                            }
                          >
                            {item.payment_status === "paid" ? "Paid" : "Unpaid"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              item.delivery_status === "delivered"
                                ? "bg-primary/20 text-primary border-primary/30 text-[11px]"
                                : "bg-muted text-muted-foreground text-[11px]"
                            }
                          >
                            {item.delivery_status === "delivered" ? "Delivered" : "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.delivered_at
                            ? new Date(item.delivered_at).toLocaleDateString()
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards View */}
              <div className="sm:hidden space-y-3">
                {entries.map((item) => (
                  <div
                    key={item.public_code}
                    className="p-3 rounded-lg border border-border/60 bg-card space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-foreground">
                        {item.public_code}
                      </span>
                      <span className="text-muted-foreground font-medium">
                        {item.item_count} item(s)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          item.payment_status === "paid"
                            ? "bg-success/20 text-success text-[10px]"
                            : "bg-warning/20 text-warning text-[10px]"
                        }
                      >
                        {item.payment_status === "paid" ? "Paid" : "Unpaid"}
                      </Badge>

                      <Badge
                        className={
                          item.delivery_status === "delivered"
                            ? "bg-primary/20 text-primary text-[10px]"
                            : "bg-muted text-muted-foreground text-[10px]"
                        }
                      >
                        {item.delivery_status === "delivered" ? "Delivered" : "Pending"}
                      </Badge>
                    </div>

                    <div className="flex justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/30">
                      <span>Ordered: {new Date(item.created_at).toLocaleDateString()}</span>
                      <span>
                        Delivered:{" "}
                        {item.delivered_at
                          ? new Date(item.delivered_at).toLocaleDateString()
                          : "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-border/40 text-xs">
                  <span className="text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
