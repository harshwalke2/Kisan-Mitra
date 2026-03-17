import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useMarketStore } from '../stores/marketStore';
import { useAuthStore } from '../stores/authStore';
import { Trash2, MapPin, CheckCircle, Truck, CreditCard } from 'lucide-react';
import { PaymentModal } from '@/components/PaymentModal';

export function Cart() {
    const { cart, updateCartItemQuantity, updateCartItemAddress, removeFromCart, clearCart, createOrder } = useMarketStore();
    const { user } = useAuthStore();
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    const totalAmount = cart.reduce((sum, item) => sum + (item.listing.pricePerUnit * item.quantity), 0);

    const handleUpdateAddress = (id: string, field: string, value: string) => {
        const item = cart.find(i => i.id === id);
        const currentAddress = item?.shippingAddress || { street: '', city: '', state: '', zipCode: '' };
        updateCartItemAddress(id, { ...currentAddress, [field]: value });
    };

    const validateAddresses = () => {
        return cart.every(item =>
            item.shippingAddress?.street &&
            item.shippingAddress?.city &&
            item.shippingAddress?.state &&
            item.shippingAddress?.zipCode
        );
    };

    const handleCheckout = () => {
        if (cart.length === 0) return;
        if (!validateAddresses()) {
            alert('Please fill in shipping address for all items.');
            return;
        }
        setIsPaymentModalOpen(true);
    };

    const handlePaymentSuccess = () => {
        // Create orders for each item
        cart.forEach(item => {
            createOrder({
                itemId: item.listing.id,
                itemName: item.listing.cropName,
                buyerId: user?.id || 'unknown',
                sellerId: item.listing.farmerId,
                price: item.listing.pricePerUnit,
                quantity: item.quantity,
                unit: item.listing.quantityUnit,
                status: 'completed'
            });
        });

        clearCart();
        setIsPaymentModalOpen(false);
        alert('Orders placed successfully! Each item will be shipped to its respective address.');
    };

    if (cart.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <Truck className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-600">Your cart is empty</h3>
                <p className="text-gray-400">Start adding crops to your cart</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-6">
                {cart.map((item) => (
                    <Card key={item.id} className="overflow-hidden">
                        <CardContent className="p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <img
                                    src={item.listing.images[0]}
                                    alt={item.listing.cropName}
                                    className="w-full sm:w-32 h-32 object-cover rounded-md"
                                />

                                <div className="flex-1 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-semibold text-lg">{item.listing.cropName}</h3>
                                            <p className="text-sm text-gray-500">Sold by {item.listing.farmerName}</p>
                                            <p className="text-green-600 font-medium mt-1">
                                                ₹{item.listing.pricePerUnit}/{item.listing.quantityUnit}
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => removeFromCart(item.id)}
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </Button>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center border rounded-md">
                                            <button
                                                className="px-3 py-1 hover:bg-gray-100 border-r"
                                                onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                                            >
                                                -
                                            </button>
                                            <span className="px-4 py-1 font-medium">{item.quantity}</span>
                                            <button
                                                className="px-3 py-1 hover:bg-gray-100 border-l"
                                                onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                                            >
                                                +
                                            </button>
                                        </div>
                                        <span className="font-semibold">
                                            Total: ₹{(item.listing.pricePerUnit * item.quantity).toLocaleString()}
                                        </span>
                                    </div>

                                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-3">
                                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                            <MapPin className="w-4 h-4" />
                                            Shipping Address for this Item
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <Input
                                                placeholder="Street Address"
                                                value={item.shippingAddress?.street || ''}
                                                onChange={(e) => handleUpdateAddress(item.id, 'street', e.target.value)}
                                                className="bg-white dark:bg-gray-900"
                                            />
                                            <Input
                                                placeholder="City"
                                                value={item.shippingAddress?.city || ''}
                                                onChange={(e) => handleUpdateAddress(item.id, 'city', e.target.value)}
                                                className="bg-white dark:bg-gray-900"
                                            />
                                            <Input
                                                placeholder="State"
                                                value={item.shippingAddress?.state || ''}
                                                onChange={(e) => handleUpdateAddress(item.id, 'state', e.target.value)}
                                                className="bg-white dark:bg-gray-900"
                                            />
                                            <Input
                                                placeholder="ZIP Code"
                                                value={item.shippingAddress?.zipCode || ''}
                                                onChange={(e) => handleUpdateAddress(item.id, 'zipCode', e.target.value)}
                                                className="bg-white dark:bg-gray-900"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="sticky bottom-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div>
                        <p className="text-gray-500">Total Amount</p>
                        <p className="text-2xl font-bold text-green-600">₹{totalAmount.toLocaleString()}</p>
                    </div>
                    <Button
                        size="lg"
                        className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-emerald-600"
                        onClick={handleCheckout}
                    >
                        <CreditCard className="w-5 h-5 mr-2" />
                        Proceed to Payment
                    </Button>
                </div>
            </div>

            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                amount={totalAmount}
                payeeName="AgroConnect Platform"
                onSuccess={handlePaymentSuccess}
                title="Checkout Payment"
            />
        </div>
    );
}
