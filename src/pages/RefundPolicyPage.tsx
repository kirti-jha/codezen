import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import usePageTitle from "@/hooks/usePageTitle";

export default function RefundPolicyPage() {
  usePageTitle("GenPay | Refund Policy");

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-4 pt-28 pb-16">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center">
            <span className="font-extrabold text-2xl tracking-tight text-primary">GenPay</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/services">
              <Button variant="hero-outline" size="sm">Services</Button>
            </Link>
            <Link to="/login">
              <Button variant="hero" size="sm">Login</Button>
            </Link>
          </div>
        </div>

        <div className="mt-10 max-w-4xl">
          <h1 className="text-4xl sm:text-5xl font-heading font-bold text-foreground">
            Refund Policy
          </h1>
          <div className="text-sm text-muted-foreground mt-3">
            Effective Date: <span className="text-foreground font-medium">March 13, 2026</span>
          </div>

          <div className="mt-8 rounded-2xl border border-border bg-gradient-card p-8 shadow-elevated">
            <p className="text-muted-foreground leading-relaxed">
              This Refund Policy governs the use of services provided by GenPay, including POS services, MATM,
              BBPS, recharge services, loan distribution, credit card services, and other financial products.
              By using our services, you agree to this Refund Policy.
            </p>

            <ol className="mt-8 space-y-7">
              <li>
                <div className="font-heading font-bold text-foreground">1. Digital Payment Transactions (POS / Collect)</div>
                <ul className="mt-3 list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                  <li>All payment transactions are processed instantly through banking networks.</li>
                  <li>Once a transaction is successfully completed, it cannot be reversed by GenPay.</li>
                  <li>In case of wrong payment made by a customer, the customer must contact their bank directly.</li>
                  <li>GenPay is not responsible for incorrect payments made due to customer error.</li>
                </ul>
              </li>

              <li>
                <div className="font-heading font-bold text-foreground">2. Failed or Pending Transactions</div>
                <div className="mt-3 text-sm text-muted-foreground">If a transaction fails but the amount is debited:</div>
                <ul className="mt-2 list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                  <li>The amount is generally auto-reversed by the bank.</li>
                  <li>Refund timeline is usually 3–7 working days (depending on bank policy).</li>
                  <li>If refund is delayed beyond this period, users should contact their respective bank first.</li>
                  <li>GenPay support can assist by providing transaction reference details.</li>
                </ul>
              </li>

              <li>
                <div className="font-heading font-bold text-foreground">3. MATM / AEPS Transactions</div>
                <ul className="mt-3 list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                  <li>Cash withdrawal and banking transactions once successfully processed cannot be refunded.</li>
                  <li>In case of failed transactions with debit, refund will be processed by the bank within standard settlement timelines.</li>
                  <li>GenPay is not responsible for delays caused by banking partners.</li>
                </ul>
              </li>

              <li>
                <div className="font-heading font-bold text-foreground">4. Recharge &amp; BBPS Services</div>
                <ul className="mt-3 list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                  <li>Mobile recharge and bill payment transactions are final once processed.</li>
                  <li>Refunds are not applicable after successful recharge or bill payment.</li>
                  <li>In case of failed recharge with amount debited, refund will be processed automatically as per bank timelines.</li>
                </ul>
              </li>

              <li>
                <div className="font-heading font-bold text-foreground">5. Soundbox &amp; POS Device Policy</div>
                <div className="mt-3 text-sm text-foreground font-semibold">Device Purchase:</div>
                <ul className="mt-2 list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                  <li>Devices once delivered are non-refundable.</li>
                  <li>Replacement is allowed only for manufacturing defects.</li>
                  <li>Defect must be reported within 7 days of delivery.</li>
                </ul>
                <div className="mt-4 text-sm text-foreground font-semibold">Device Rental:</div>
                <ul className="mt-2 list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                  <li>Rental charges are non-refundable.</li>
                  <li>Security deposit (if applicable) will be refunded after device return in good condition.</li>
                  <li>Damaged devices may attract repair or replacement charges.</li>
                </ul>
              </li>

              <li>
                <div className="font-heading font-bold text-foreground">6. Loan &amp; Credit Card Services</div>
                <div className="mt-3 text-sm text-muted-foreground">
                  GenPay acts as a referral or distribution partner for banks/NBFCs.
                </div>
                <ul className="mt-2 list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                  <li>Loan processing fees charged by lending partners are non-refundable.</li>
                  <li>Loan approval and disbursal are subject to partner policies.</li>
                  <li>Credit card issuance and related charges are governed by the issuing bank.</li>
                  <li>GenPay does not guarantee loan approval.</li>
                </ul>
              </li>

              <li>
                <div className="font-heading font-bold text-foreground">7. Insurance Products (If Applicable)</div>
                <ul className="mt-3 list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                  <li>Insurance premium refunds depend on the cancellation policy of the respective insurance company.</li>
                  <li>Free-look period (if applicable) will be governed by insurer terms.</li>
                  <li>GenPay is not responsible for insurer claim decisions.</li>
                </ul>
              </li>

              <li>
                <div className="font-heading font-bold text-foreground">8. Service Charges &amp; Subscription Fees</div>
                <div className="mt-3 text-sm text-muted-foreground">
                  Activation fees, platform fees, processing fees, and subscription charges are non-refundable unless there is
                  a verified technical error from GenPay’s side.
                </div>
              </li>

              <li>
                <div className="font-heading font-bold text-foreground">9. Refund Processing Timeline</div>
                <div className="mt-3 text-sm text-muted-foreground">If a refund is approved:</div>
                <ul className="mt-2 list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                  <li>It will be processed within 7–10 working days.</li>
                  <li>Refund will be credited to the original payment method.</li>
                  <li>Processing time may vary depending on banking partners.</li>
                </ul>
              </li>

              <li>
                <div className="font-heading font-bold text-foreground">10. Cancellation Policy</div>
                <ul className="mt-3 list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                  <li>Services once activated cannot be cancelled.</li>
                  <li>Subscription-based services must be cancelled before renewal date.</li>
                  <li>Cancellation requests must be submitted through official support channels.</li>
                </ul>
              </li>

              <li>
                <div className="font-heading font-bold text-foreground">11. Policy Updates</div>
                <div className="mt-3 text-sm text-muted-foreground">
                  GenPay reserves the right to modify this Refund Policy at any time. Updated policies will be published on this page.
                </div>
              </li>
            </ol>

            <div className="mt-10 rounded-2xl border border-primary/20 bg-primary/5 p-6">
              <div className="font-heading font-bold text-foreground">Need help?</div>
              <div className="mt-2 text-sm text-muted-foreground">
                Contact support at{" "}
                <a className="text-foreground font-medium hover:underline" href="mailto:care@genpay.in">
                  care@genpay.in
                </a>{" "}
                or call{" "}
                <a className="text-foreground font-medium hover:underline" href="tel:+918860037218">
                  +91 88600 37218
                </a>
                .
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
