import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    CreditCard,
    Smartphone,
    CheckCircle,
    QrCode,
    Wallet
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    amount: number;
    payeeName: string;
    onSuccess: () => void;
    title?: string;
}

export function PaymentModal({
    isOpen,
    onClose,
    amount,
    payeeName,
    onSuccess,
    title = 'Make Payment'
}: PaymentModalProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [activeMethod, setActiveMethod] = useState('upi');

    const handlePayment = () => {
        setIsProcessing(true);
        // Eliminate payment processing delay
        setTimeout(() => {
            setIsProcessing(false);
            setIsSuccess(true);
            setTimeout(() => {
                onSuccess();
                onClose();
                setIsSuccess(false); // Reset for next time
            }, 1500);
        }, 2000);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !isProcessing && !isSuccess && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>

                {isSuccess ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-2">
                            <CheckCircle className="w-8 h-8 text-green-600 animate-in zoom-in duration-300" />
                        </div>
                        <h3 className="text-xl font-semibold text-green-700">Payment Successful!</h3>
                        <p className="text-gray-500">
                            ₹{amount.toLocaleString()} sent to {payeeName}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg flex justify-between items-center">
                            <div>
                                <p className="text-sm text-gray-500">Total Amount</p>
                                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                                    ₹{amount.toLocaleString()}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-500">Pay To</p>
                                <p className="font-medium">{payeeName}</p>
                            </div>
                        </div>

                        <Tabs value={activeMethod} onValueChange={setActiveMethod} className="w-full">
                            <TabsList className="grid w-full grid-cols-3 mb-4">
                                <TabsTrigger value="upi" className="flex items-center gap-2">
                                    <Smartphone className="w-4 h-4" /> UPI
                                </TabsTrigger>
                                <TabsTrigger value="card" className="flex items-center gap-2">
                                    <CreditCard className="w-4 h-4" /> Card
                                </TabsTrigger>
                                <TabsTrigger value="netbanking" className="flex items-center gap-2">
                                    <Wallet className="w-4 h-4" /> NetBanking
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="upi" className="space-y-4">
                                <div className="flex flex-col items-center justify-center p-4 border border-dashed border-gray-300 rounded-lg">
                                    <QrCode className="w-32 h-32 text-gray-800 dark:text-white mb-2" />
                                    <p className="text-xs text-gray-400">Scan QR Code to Pay</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Or verify VPA</label>
                                    <div className="flex gap-2">
                                        <Input placeholder="username@upi" />
                                        <Button variant="outline">Verify</Button>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="card" className="space-y-4">
                                <Input placeholder="Card Number" />
                                <div className="grid grid-cols-2 gap-4">
                                    <Input placeholder="MM/YY" />
                                    <Input placeholder="CVV" />
                                </div>
                                <Input placeholder="Card Holder Name" />
                            </TabsContent>

                            <TabsContent value="netbanking" className="space-y-4">
                                <div className="grid grid-cols-2 gap-2">
                                    {['SBI', 'HDFC', 'ICICI', 'Axis'].map(bank => (
                                        <Button key={bank} variant="outline" className="justify-start">
                                            {bank} Bank
                                        </Button>
                                    ))}
                                </div>
                            </TabsContent>
                        </Tabs>

                        <Button
                            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 h-12 text-lg"
                            disabled={isProcessing}
                            onClick={handlePayment}
                        >
                            {isProcessing ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Processing...
                                </div>
                            ) : (
                                `Pay ₹${amount.toLocaleString()}`
                            )}
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
