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
      description: t('Settings saved successfully!'),
    });
  };
  
  return (
    <DashboardShell>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            <CardTitle className="text-xl">{t('Settings')}</CardTitle>
          </div>
          <CardDescription>
            {t('Configure your application settings and preferences')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="general">{t('General')}</TabsTrigger>
              <TabsTrigger value="language">{t('Language')}</TabsTrigger>
              <TabsTrigger value="theme">{t('Theme')}</TabsTrigger>
              <TabsTrigger value="connection">{t('Connection')}</TabsTrigger>
              <TabsTrigger value="notifications">{t('Notifications')}</TabsTrigger>
              <TabsTrigger value="security">{t('Security')}</TabsTrigger>
            </TabsList>
            
            {/* General Settings */}
            <TabsContent value="general" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-md">{t('General Settings')}</CardTitle>
                  <CardDescription>{t('Configure basic application settings')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t('Auto-save changes')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t('Automatically save changes when editing')}
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t('Show tooltips')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t('Display helpful tooltips throughout the application')}
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
                    <CardTitle className="text-md">{t('Language Settings')}</CardTitle>
                  </div>
                  <CardDescription>{t('Configure language and regional preferences')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="language">{t('Interface Language')}</Label>
                    <Select value={language} onValueChange={handleLanguageChange}>
                      <SelectTrigger id="language">
                        <SelectValue placeholder={t('Select language')} />
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
                    <Label htmlFor="date-format">{t('Date Format')}</Label>
                    <Select value={dateFormat} onValueChange={setDateFormat}>
                      <SelectTrigger id="date-format">
                        <SelectValue placeholder={t('Select date format')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="time-format">{t('Time Format')}</Label>
                    <Select value={timeFormat} onValueChange={setTimeFormat}>
                      <SelectTrigger id="time-format">
                        <SelectValue placeholder={t('Select time format')} />
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
                    <CardTitle className="text-md">{t('Theme & Appearance')}</CardTitle>
                  </div>
                  <CardDescription>{t('Customize the look and feel of the application')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="theme">{t('Theme')}</Label>
                    <Select value={theme} onValueChange={setTheme}>
                      <SelectTrigger id="theme">
                        <SelectValue placeholder={t('Select theme')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">{t('Light')}</SelectItem>
                        <SelectItem value="dark">{t('Dark')}</SelectItem>
                        <SelectItem value="system">{t('System')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="font-size">{t('Font Size')}</Label>
                    <Select value={fontSize} onValueChange={setFontSize}>
                      <SelectTrigger id="font-size">
                        <SelectValue placeholder={t('Select font size')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">{t('Small')}</SelectItem>
                        <SelectItem value="medium">{t('Medium')}</SelectItem>
                        <SelectItem value="large">{t('Large')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t('Animations')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t('Enable smooth animations throughout the app')}
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
                    <CardTitle className="text-md">{t('Connection Settings')}</CardTitle>
                  </div>
                  <CardDescription>{t('Manage online/offline mode and sync settings')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t('Online Mode')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t('Enable real-time synchronization')}
                      </p>
                    </div>
                    <Switch checked={isOnline} onCheckedChange={setIsOnline} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t('Auto-sync')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t('Automatically sync changes when online')}
                      </p>
                    </div>
                    <Switch checked={autoSync} onCheckedChange={setAutoSync} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t('Offline Access')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t('Allow access to data when offline')}
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
                    <CardTitle className="text-md">{t('Notification Settings')}</CardTitle>
                  </div>
                  <CardDescription>{t('Configure how you receive notifications')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t('Email Notifications')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t('Receive notifications via email')}
                      </p>
                    </div>
                    <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t('Push Notifications')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t('Receive push notifications')}
                      </p>
                    </div>
                    <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t('Notification Sound')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t('Play sound for notifications')}
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
                    <CardTitle className="text-md">{t('Security Settings')}</CardTitle>
                  </div>
                  <CardDescription>{t('Manage security and privacy settings')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t('Two-Factor Authentication')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t('Add an extra layer of security to your account')}
                      </p>
                    </div>
                    <Switch checked={twoFactorAuth} onCheckedChange={setTwoFactorAuth} />
                  </div>
                  
                  <div>
                    <Label htmlFor="session-timeout">{t('Session Timeout (minutes)')}</Label>
                    <Select value={sessionTimeout} onValueChange={setSessionTimeout}>
                      <SelectTrigger id="session-timeout">
                        <SelectValue placeholder={t('Select timeout')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 {t('minutes')}</SelectItem>
                        <SelectItem value="30">30 {t('minutes')}</SelectItem>
                        <SelectItem value="60">1 {t('hour')}</SelectItem>
                        <SelectItem value="120">2 {t('hours')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="password-expiry">{t('Password Expiry (days)')}</Label>
                    <Select value={passwordExpiry} onValueChange={setPasswordExpiry}>
                      <SelectTrigger id="password-expiry">
                        <SelectValue placeholder={t('Select expiry')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 {t('days')}</SelectItem>
                        <SelectItem value="60">60 {t('days')}</SelectItem>
                        <SelectItem value="90">90 {t('days')}</SelectItem>
                        <SelectItem value="180">180 {t('days')}</SelectItem>
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
            {t('Save All Settings')}
          </Button>
        </CardFooter>
      </Card>
    </DashboardShell>
  );
};

export default Settings; 