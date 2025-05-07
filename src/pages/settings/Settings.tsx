import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from '@/hooks/use-language';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Globe, Palette, Wifi, WifiOff, Bell, Shield, Save, Settings as SettingsIcon } from 'lucide-react';

const Settings = () => {
  const { currentLanguage, changeLanguage, t } = useLanguage();
  const { toast } = useToast();
  
  // Language settings
  const [language, setLanguage] = useState(currentLanguage);
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');
  const [timeFormat, setTimeFormat] = useState('12h');
  
  // Theme settings
  const [theme, setTheme] = useState('system');
  const [fontSize, setFontSize] = useState('medium');
  const [animations, setAnimations] = useState(true);
  
  // Online/Offline settings
  const [isOnline, setIsOnline] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [offlineAccess, setOfflineAccess] = useState(true);
  
  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [notificationSound, setNotificationSound] = useState(true);
  
  // Security settings
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('30');
  const [passwordExpiry, setPasswordExpiry] = useState('90');

  const handleLanguageChange = async (newLanguage: string) => {
    const success = await changeLanguage(newLanguage);
    if (success) {
      setLanguage(newLanguage);
    }
  };

  // Effect to sync language with i18n
  useEffect(() => {
    if (currentLanguage !== language) {
      setLanguage(currentLanguage);
    }
  }, [currentLanguage]);
  
  const handleSaveSettings = () => {
    toast({
      description: t('settings.saved', 'Settings saved successfully!'),
    });
  };
  
  return (
    <DashboardShell>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            <CardTitle className="text-xl">{t('settings.title')}</CardTitle>
          </div>
          <CardDescription>
            {t('settings.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="general">{t('settings.general.title')}</TabsTrigger>
              <TabsTrigger value="language">{t('settings.language.title')}</TabsTrigger>
              <TabsTrigger value="theme">{t('settings.theme.title')}</TabsTrigger>
              <TabsTrigger value="connection">{t('settings.connection.title')}</TabsTrigger>
              <TabsTrigger value="notifications">{t('settings.notifications.title')}</TabsTrigger>
              <TabsTrigger value="security">{t('settings.security.title')}</TabsTrigger>
            </TabsList>
            
            {/* General Settings */}
            <TabsContent value="general" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-md">{t('settings.general.title')}</CardTitle>
                  <CardDescription>{t('settings.general.description')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t('settings.general.autoSave')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t('settings.general.autoSaveDesc')}
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t('settings.general.tooltips')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t('settings.general.tooltipsDesc')}
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Language Settings */}
            <TabsContent value="language" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center">
                    <Globe className="h-5 w-5 mr-2" />
                    <CardTitle className="text-md">{t('settings.language.title')}</CardTitle>
                  </div>
                  <CardDescription>{t('settings.language.description')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="language">{t('settings.language.interfaceLanguage')}</Label>
                    <Select value={language} onValueChange={handleLanguageChange}>
                      <SelectTrigger id="language">
                        <SelectValue placeholder={t('settings.language.selectLanguage', 'Select language')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="hi">हिंदी (Hindi)</SelectItem>
                        <SelectItem value="bn">বাংলা (Bengali)</SelectItem>
                        <SelectItem value="te">తెలుగు (Telugu)</SelectItem>
                        <SelectItem value="mr">मराठी (Marathi)</SelectItem>
                        <SelectItem value="ta">தமிழ் (Tamil)</SelectItem>
                        <SelectItem value="gu">ગુજરાતી (Gujarati)</SelectItem>
                        <SelectItem value="kn">ಕನ್ನಡ (Kannada)</SelectItem>
                        <SelectItem value="ml">മലയാളം (Malayalam)</SelectItem>
                        <SelectItem value="pa">ਪੰਜਾਬੀ (Punjabi)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="date-format">{t('settings.language.dateFormat')}</Label>
                    <Select value={dateFormat} onValueChange={setDateFormat}>
                      <SelectTrigger id="date-format">
                        <SelectValue placeholder={t('settings.language.selectDateFormat', 'Select date format')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="time-format">{t('settings.language.timeFormat')}</Label>
                    <Select value={timeFormat} onValueChange={setTimeFormat}>
                      <SelectTrigger id="time-format">
                        <SelectValue placeholder={t('settings.language.selectTimeFormat', 'Select time format')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                        <SelectItem value="24h">24-hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Theme Settings */}
            <TabsContent value="theme" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center">
                    <Palette className="h-5 w-5 mr-2" />
                    <CardTitle className="text-md">Theme & Appearance</CardTitle>
                  </div>
                  <CardDescription>Customize the look and feel of the application</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="theme">Theme</Label>
                    <Select value={theme} onValueChange={setTheme}>
                      <SelectTrigger id="theme">
                        <SelectValue placeholder="Select theme" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="font-size">Font Size</Label>
                    <Select value={fontSize} onValueChange={setFontSize}>
                      <SelectTrigger id="font-size">
                        <SelectValue placeholder="Select font size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Animations</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable smooth animations throughout the app
                      </p>
                    </div>
                    <Switch checked={animations} onCheckedChange={setAnimations} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Connection Settings */}
            <TabsContent value="connection" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center">
                    {isOnline ? <Wifi className="h-5 w-5 mr-2" /> : <WifiOff className="h-5 w-5 mr-2" />}
                    <CardTitle className="text-md">Connection Settings</CardTitle>
                  </div>
                  <CardDescription>Manage online/offline mode and sync settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Online Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable real-time synchronization
                      </p>
                    </div>
                    <Switch checked={isOnline} onCheckedChange={setIsOnline} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-sync</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically sync changes when online
                      </p>
                    </div>
                    <Switch checked={autoSync} onCheckedChange={setAutoSync} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Offline Access</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow access to data when offline
                      </p>
                    </div>
                    <Switch checked={offlineAccess} onCheckedChange={setOfflineAccess} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Notification Settings */}
            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center">
                    <Bell className="h-5 w-5 mr-2" />
                    <CardTitle className="text-md">Notification Settings</CardTitle>
                  </div>
                  <CardDescription>Configure how you receive notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications via email
                      </p>
                    </div>
                    <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive push notifications
                      </p>
                    </div>
                    <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Notification Sound</Label>
                      <p className="text-sm text-muted-foreground">
                        Play sound for notifications
                      </p>
                    </div>
                    <Switch checked={notificationSound} onCheckedChange={setNotificationSound} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Security Settings */}
            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    <CardTitle className="text-md">Security Settings</CardTitle>
                  </div>
                  <CardDescription>Manage security and privacy settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    <Switch checked={twoFactorAuth} onCheckedChange={setTwoFactorAuth} />
                  </div>
                  
                  <div>
                    <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                    <Select value={sessionTimeout} onValueChange={setSessionTimeout}>
                      <SelectTrigger id="session-timeout">
                        <SelectValue placeholder="Select timeout" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="password-expiry">Password Expiry (days)</Label>
                    <Select value={passwordExpiry} onValueChange={setPasswordExpiry}>
                      <SelectTrigger id="password-expiry">
                        <SelectValue placeholder="Select expiry" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="60">60 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                        <SelectItem value="180">180 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleSaveSettings}>
            <Save className="mr-2 h-4 w-4" />
            {t('settings.saveAll', 'Save All Settings')}
          </Button>
        </CardFooter>
      </Card>
    </DashboardShell>
  );
};

export default Settings; 