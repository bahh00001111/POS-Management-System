import { useState, useEffect, useRef, useCallback } from 'react';
import axiosClient from '../api/axiosClient';
import { QRCodeCanvas } from 'qrcode.react';
import { X, Loader2, QrCode, CheckCircle2, Zap } from 'lucide-react';

/**
 * KHQR Payment Modal (Option 1 — order-first flow).
 *
 * Generates a dynamic Bakong/EMVCo KHQR string for an already-created order,
 * displays it as a QR code, polls the status every 3 seconds, and provides a
 * "Simulate Paid" button so the full flow can be tested without a bank sandbox.
 *
 * Props:
 *   open         {boolean}  whether the modal is visible
 *   orderId      {number}   id of the order awaiting payment
 *   amount       {number}   amount to charge (in the merchant currency)
 *   currency     {string}   'KHR' | 'USD'
 *   merchantName {string}   name shown on the KHQR card
 *   onClose      {function} closes the modal (cancelling payment)
 *   onSuccess    {function} called when payment reaches SUCCESS
 */
export default function KhqrPaymentModal({
  open,
  orderId,
  amount = 0,
  currency = 'KHR',
  merchantName = 'COFFEE POS',
  onClose,
  onSuccess,
}) {
  const [khqr, setKhqr] = useState(null);
  const [status, setStatus] = useState('PENDING');
  const [error, setError] = useState('');
  const [verifyNotice, setVerifyNotice] = useState('');
  const [generating, setGenerating] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const successNotifiedRef = useRef(false);

  const isPaid = status === 'SUCCESS' || status === 'PAID';

  const reset = useCallback(() => {
    setKhqr(null);
    setStatus('PENDING');
    setError('');
    setVerifyNotice('');
    successNotifiedRef.current = false;
    setSimulating(false);
  }, []);

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  // 1. Generate the dynamic KHQR payload for the order
  const generateQr = useCallback(async () => {
    if (!open || !orderId) return;
    setGenerating(true);
    setError('');
    try {
      const res = await axiosClient.post('/khqr/generate', {
        order_id: orderId,
        amount: Number(amount || 0),
        currency,
      });
      setKhqr(res.data?.data || null);
      setStatus(res.data?.data?.status || 'PENDING');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate QR code.');
      setKhqr(null);
    } finally {
      setGenerating(false);
    }
  }, [open, orderId, amount, currency]);

  useEffect(() => {
    if (open) generateQr();
  }, [open, generateQr]);

  // Notify parent exactly once when payment is confirmed
  const complete = useCallback(async () => {
    if (successNotifiedRef.current) return;
    successNotifiedRef.current = true;
    try {
      if (onSuccess) await onSuccess();
    } finally {
      setStatus('SUCCESS');
    }
  }, [onSuccess]);

  // 2. Verify the payment against the Bakong Open API every 3 seconds.
  //    /khqr/status only reads the local database and NEVER sees money that
  //    arrived at the merchant's Bakong account — that is why real payments
  //    used to leave this modal stuck showing the same QR. /payments/verify
  //    asks NBC directly (check_transaction_by_md5) and flips the order to
  //    PAID in the DB the moment the bank confirms the transfer.
  useEffect(() => {
    if (!open || !khqr?.md5 || !orderId || isPaid) return;

    const timer = setInterval(async () => {
      try {
        const res = await axiosClient.post('/payments/verify', {
          md5: khqr.md5,
          order_id: orderId,
        });
        setVerifyNotice('');
        if (res.data?.data?.paid === true) {
          await complete();
        }
      } catch (err) {
        const statusCode = err.response?.status;
        // 502 = bank gateway error, 503 = BAKONG_OPEN_API_TOKEN not set on
        // the server. Keep polling (it self-heals) but tell the operator.
        if (statusCode === 502 || statusCode === 503) {
          const detail =
            err.response?.data?.message || (statusCode === 503 ? 'Bakong Open API token is not configured.' : '');
          setVerifyNotice(detail ? `${detail} Still trying…` : 'Payment gateway unavailable — still trying…');
        } else if (statusCode === 404) {
          clearInterval(timer);
          setError('Payment request not found. Please try again.');
        }
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [open, khqr?.md5, orderId, isPaid, complete]);

  // 3. Simulate a successful bank payment (mock only)
  const handleSimulatePaid = async () => {
    if (!khqr?.reference || simulating) return;
    setSimulating(true);
    setError('');
    try {
      const res = await axiosClient.post('/khqr/mock-pay', { reference: khqr.reference });
      setStatus(res.data?.data?.status || 'SUCCESS');
      await complete();
    } catch (err) {
      setError(err.response?.data?.message || 'Simulation failed.');
    } finally {
      setSimulating(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl relative overflow-hidden">
        <button
          onClick={onClose}
          disabled={simulating}
          className="absolute right-4 top-4 text-stone-400 hover:text-stone-600 transition cursor-pointer disabled:opacity-40"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="bg-coffee-600 text-white px-6 pt-6 pb-5">
          <div className="flex items-center gap-2">
            <QrCode size={18} />
            <h2 className="font-bold tracking-wide text-sm">Bakong / KHQR Payment</h2>
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="text-[11px] text-coffee-100">Order #{orderId ?? ''}</p>
              <p className="text-[11px] text-coffee-100">Scan with Bakong / mobile bank app</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-coffee-100">Amount</p>
              <p className="text-xl font-extrabold leading-tight">
                {Number(amount || 0).toLocaleString()} {currency}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 flex flex-col items-center gap-4">
          {/* Paid confirmation */}
          {isPaid ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 size={48} className="text-green-500" />
              <p className="text-sm font-extrabold text-stone-800">Payment Successful</p>
              <p className="text-[11px] text-stone-500 font-sans">
                Rec #{khqr?.reference} • {Number(amount || 0).toLocaleString()} {currency}
              </p>
            </div>
          ) : generating ? (
            <div className="flex flex-col items-center gap-3 py-10 text-stone-500">
              <Loader2 size={28} className="animate-spin text-coffee-600" />
              <p className="text-xs font-bold text-stone-600">Generating payment QR…</p>
            </div>
          ) : khqr?.payload ? (
            <>
              {/* KHQR Card */}
              <div className="bg-white rounded-2xl p-3 shadow-sm border border-stone-200 relative">
                <div className="relative">
                  <QRCodeCanvas
                    value={khqr.payload}
                    size={196}
                    level="M"
                    bgColor="#FFFFFF"
                    fgColor="#1A1A1A"
                    marginSize={2}
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="bg-[#173a5f] text-white text-[9px] font-black tracking-widest px-2.5 py-1 rounded-full shadow-md">
                      KHQR
                    </span>
                  </div>
                </div>
                <p className="text-center text-[10px] text-stone-500 mt-1.5 font-sans">
                  Ref: {khqr.reference}
                </p>
              </div>

              <div className="text-center gap-1 flex flex-col">
                <p className="text-xs font-bold text-stone-800">{merchantName}</p>
                <p className="text-[11px] text-stone-500 font-sans">
                  Waiting for payment — confirming with the bank every 3s…
                </p>
                {verifyNotice && (
                  <p className="text-[11px] font-bold text-amber-600 text-center font-sans">
                    {verifyNotice}
                  </p>
                )}
              </div>

              {/* Mock payment simulator — only available in development builds; a
                  cashier must never be able to mark an order paid without
                  real Bakong confirmation. */}
              {import.meta.env.DEV && (
                <button
                  onClick={handleSimulatePaid}
                  disabled={simulating}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {simulating ? (
                    <>
                      <Loader2 size={15} className="animate-spin" /> Simulating…
                    </>
                  ) : (
                    <>
                      <Zap size={15} /> Simulate Paid (Mock)
                    </>
                  )}
                </button>
              )}
            </>
          ) : (
            <div className="py-8 text-center">
              <p className="text-[11px] text-stone-500 font-sans">
                {error || 'Unable to generate payment QR. Check your Bakong merchant settings.'}
              </p>
            </div>
          )}

          {error && !isPaid && khqr?.payload && (
            <p className="text-[11px] font-bold text-red-500 text-center font-sans">{error}</p>
          )}

          <div className="rounded-xl bg-stone-50 border border-stone-100 px-4 py-2.5 text-center">
            <p className="text-[11px] text-stone-500 font-sans">
              The order stays <span className="font-bold text-stone-700">UNPAID</span> until the
              bank confirms the transfer, then it is automatically marked{' '}
              <span className="font-bold text-green-600">PAID</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}