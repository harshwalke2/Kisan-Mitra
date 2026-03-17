import { Users } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';

export function UserSwitcher() {
    const { user, allUsers, switchUser } = useAuthStore();

    if (!user) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        className="bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg hover:shadow-xl"
                        size="lg"
                    >
                        <Users className="w-5 h-5 mr-2" />
                        {user.name}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">
                        Switch User (Testing)
                    </div>
                    {allUsers.map((u) => (
                        <DropdownMenuItem
                            key={u.id}
                            onClick={() => switchUser(u.id)}
                            className={user.id === u.id ? 'bg-green-50' : ''}
                        >
                            <div className="flex items-center gap-3 w-full">
                                <img
                                    src={u.avatar}
                                    alt={u.name}
                                    className="w-8 h-8 rounded-full"
                                />
                                <div className="flex-1">
                                    <div className="font-medium">{u.name}</div>
                                    <div className="text-xs text-gray-500">{u.location?.address}</div>
                                </div>
                                {user.id === u.id && (
                                    <div className="text-green-600 text-xs font-semibold">Active</div>
                                )}
                            </div>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
