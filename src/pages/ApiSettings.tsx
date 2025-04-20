import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardShell } from '@/components/DashboardShell';
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiConnectionStatus } from '@/components/ApiConnectionStatus';
import { CloudCog, Database, Cloud, Server } from 'lucide-react';

const ApiSettings = () => {
  const { toast } = useToast();
  const [localConnectionStatus, setLocalConnectionStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [remoteConnectionStatus, setRemoteConnectionStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  const [localConfig, setLocalConfig] = useState({
    host: 'localhost',
    port: '27017',
    database: 'restaurant-app',
    username: '',
    password: ''
  });
  
  const [remoteConfig, setRemoteConfig] = useState({
    host: '',
    port: '27017',
    database: 'restaurant-app',
    username: '',
    password: ''
  });
  
  const handleTestConnection = async (type: 'local' | 'remote') => {
    const connectionStatus = type === 'local' ? setLocalConnectionStatus : setRemoteConnectionStatus;
    connectionStatus('loading');
    
    // Simulate API call to test connection
    setTimeout(() => {
      if (type === 'local') {
        connectionStatus('success');
        toast({
          description: "Successfully connected to local database.",
        });
      } else {
        const config = remoteConfig;
        if (!config.host) {
          connectionStatus('error');
          toast({
            variant: "destructive",
            description: "Remote host is required.",
          });
          return;
        }
        connectionStatus('success');
        toast({
          description: "Successfully connected to remote database.",
        });
      }
    }, 1500);
  };
  
  const handleSyncDatabases = async () => {
    if (localConnectionStatus !== 'success' || remoteConnectionStatus !== 'success') {
      toast({
        variant: "destructive",
        description: "Please test both connections before syncing.",
      });
      return;
    }
    
    toast({
      description: "Database sync initiated. This may take a few minutes.",
    });
    
    // In a real app, this would be an API call to sync databases
    setTimeout(() => {
      toast({
        description: "Databases successfully synchronized!",
      });
    }, 3000);
  };
  
  return (
    <DashboardShell>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-xl">API & Database Settings</CardTitle>
          <CardDescription>
            Configure your database connections and sync settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="connections" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="connections">Database Connections</TabsTrigger>
              <TabsTrigger value="sync">Sync Configuration</TabsTrigger>
            </TabsList>
            <TabsContent value="connections" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {/* Local Database */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center">
                      <Database className="h-5 w-5 mr-2" />
                      <CardTitle className="text-md">Local Database</CardTitle>
                    </div>
                    <CardDescription>Configure your local MongoDB connection</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                          <Label htmlFor="local-host">Host</Label>
                          <Input
                            id="local-host"
                            value={localConfig.host}
                            onChange={(e) => setLocalConfig({ ...localConfig, host: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="local-port">Port</Label>
                          <Input
                            id="local-port"
                            value={localConfig.port}
                            onChange={(e) => setLocalConfig({ ...localConfig, port: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="local-database">Database Name</Label>
                        <Input
                          id="local-database"
                          value={localConfig.database}
                          onChange={(e) => setLocalConfig({ ...localConfig, database: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="local-username">Username (optional)</Label>
                        <Input
                          id="local-username"
                          value={localConfig.username}
                          onChange={(e) => setLocalConfig({ ...localConfig, username: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="local-password">Password (optional)</Label>
                        <Input
                          id="local-password"
                          type="password"
                          value={localConfig.password}
                          onChange={(e) => setLocalConfig({ ...localConfig, password: e.target.value })}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <ApiConnectionStatus status={localConnectionStatus} />
                        <Button 
                          onClick={() => handleTestConnection('local')}
                          disabled={localConnectionStatus === 'loading'}
                        >
                          Test Connection
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Remote Database */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center">
                      <Cloud className="h-5 w-5 mr-2" />
                      <CardTitle className="text-md">Remote Database</CardTitle>
                    </div>
                    <CardDescription>Configure your remote MongoDB connection</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                          <Label htmlFor="remote-host">Host</Label>
                          <Input
                            id="remote-host"
                            placeholder="e.g., mongodb.example.com"
                            value={remoteConfig.host}
                            onChange={(e) => setRemoteConfig({ ...remoteConfig, host: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="remote-port">Port</Label>
                          <Input
                            id="remote-port"
                            value={remoteConfig.port}
                            onChange={(e) => setRemoteConfig({ ...remoteConfig, port: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="remote-database">Database Name</Label>
                        <Input
                          id="remote-database"
                          value={remoteConfig.database}
                          onChange={(e) => setRemoteConfig({ ...remoteConfig, database: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="remote-username">Username</Label>
                        <Input
                          id="remote-username"
                          value={remoteConfig.username}
                          onChange={(e) => setRemoteConfig({ ...remoteConfig, username: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="remote-password">Password</Label>
                        <Input
                          id="remote-password"
                          type="password"
                          value={remoteConfig.password}
                          onChange={(e) => setRemoteConfig({ ...remoteConfig, password: e.target.value })}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <ApiConnectionStatus status={remoteConnectionStatus} />
                        <Button 
                          onClick={() => handleTestConnection('remote')}
                          disabled={remoteConnectionStatus === 'loading'}
                        >
                          Test Connection
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            <TabsContent value="sync" className="space-y-6">
              {/* Sync Settings */}
              <Card>
                <CardHeader>
                  <div className="flex items-center">
                    <CloudCog className="h-5 w-5 mr-2" />
                    <CardTitle className="text-md">Database Sync Settings</CardTitle>
                  </div>
                  <CardDescription>
                    Configure how your databases synchronize data
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="sync-direction">Sync Direction</Label>
                      <Select defaultValue="bidirectional">
                        <SelectTrigger id="sync-direction">
                          <SelectValue placeholder="Select direction" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="localToRemote">Local → Remote only</SelectItem>
                          <SelectItem value="remoteToLocal">Remote → Local only</SelectItem>
                          <SelectItem value="bidirectional">Bidirectional</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="sync-frequency">Sync Frequency</Label>
                      <Select defaultValue="manual">
                        <SelectTrigger id="sync-frequency">
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Manual only</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="hourly">Hourly</SelectItem>
                          <SelectItem value="realtime">Real-time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="conflict-resolution">Conflict Resolution</Label>
                    <Select defaultValue="newest">
                      <SelectTrigger id="conflict-resolution">
                        <SelectValue placeholder="Select strategy" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest wins</SelectItem>
                        <SelectItem value="remote">Remote wins</SelectItem>
                        <SelectItem value="local">Local wins</SelectItem>
                        <SelectItem value="manual">Manual resolution</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Data to Synchronize</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="sync-restaurants" className="rounded" defaultChecked />
                        <label htmlFor="sync-restaurants">Restaurants</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="sync-menu" className="rounded" defaultChecked />
                        <label htmlFor="sync-menu">Menu Items</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="sync-tables" className="rounded" defaultChecked />
                        <label htmlFor="sync-tables">Tables</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="sync-orders" className="rounded" defaultChecked />
                        <label htmlFor="sync-orders">Orders</label>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <div className="text-sm text-muted-foreground">
                    Last synced: Never
                  </div>
                  <Button 
                    onClick={handleSyncDatabases}
                    disabled={localConnectionStatus !== 'success' || remoteConnectionStatus !== 'success'}
                  >
                    <Server className="h-4 w-4 mr-2" />
                    Sync Databases Now
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-md">Additional Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="compress-data" className="rounded" defaultChecked />
                    <label htmlFor="compress-data">Compress data during transfer</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="encrypt-data" className="rounded" defaultChecked />
                    <label htmlFor="encrypt-data">Encrypt sensitive data</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="backup-before-sync" className="rounded" defaultChecked />
                    <label htmlFor="backup-before-sync">Create backup before sync</label>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </DashboardShell>
  );
};

export default ApiSettings;
