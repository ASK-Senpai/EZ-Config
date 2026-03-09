"use client";

import React, { useState } from "react";
import { User, Mail, Shield, Trash2, Save, AlertTriangle } from "lucide-react";
import { useAuth } from "@/components/features/auth/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function AccountPage() {

    const { user } = useAuth();
    const [displayName, setDisplayName] = useState(user?.displayName || "");
    const [saving, setSaving] = useState(false);

    const handleUpdateProfile = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/user/profile", {
                method: "PATCH",
                body: JSON.stringify({ displayName }),
                headers: { "Content-Type": "application/json" }
            });
            if (res.ok) alert("Profile updated!");
            else alert("Failed to update profile.");
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
                <p className="text-muted-foreground">Manage your profile and account preferences.</p>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Profile Information</CardTitle>
                        <CardDescription>Update your public display name.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <div className="flex items-center gap-2">
                                <Input id="email" value={user?.email || ""} disabled className="bg-muted" />
                                <Badge variant="outline">Verified</Badge>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name">Display Name</Label>
                            <Input
                                id="name"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="Enter your name"
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4">
                        <Button onClick={handleUpdateProfile} disabled={saving}>
                            {saving ? "Saving..." : "Save Changes"}
                        </Button>
                    </CardFooter>
                </Card>

                <Card className="border-red-500/20">
                    <CardHeader>
                        <CardTitle className="text-red-500">Danger Zone</CardTitle>
                        <CardDescription>Permanently delete your account and all associated data.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-start gap-4 p-4 bg-red-500/5 border border-red-500/10 rounded-lg">
                            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-semibold text-red-500">This action is irreversible.</p>
                                <p className="text-muted-foreground mt-1">Once you delete your account, all your saved builds, reports, and subscription data will be permanently removed from our servers.</p>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4">
                        <Button variant="destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Account
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
