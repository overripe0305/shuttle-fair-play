import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw, Download, Upload, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface OfflineIndicatorProps {
  clubId?: string;
}

export const OfflineIndicator = ({ clubId }: OfflineIndicatorProps) => {
  const {
    isOnline,
    isSyncing,
    lastSyncTime,
    hasLocalChanges,
    downloadData,
    uploadChanges,
    fullSync,
    clearLocalData
  } = useOfflineSync(clubId);

  return (
    <div className="flex items-center gap-2">
      {/* Online/Offline Status */}
      <Badge variant={isOnline ? "default" : "destructive"} className="flex items-center gap-1">
        {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
        {isOnline ? 'Online' : 'Offline'}
      </Badge>

      {/* Local Changes Indicator */}
      {hasLocalChanges && (
        <Badge variant="secondary" className="flex items-center gap-1">
          <RefreshCw className="h-3 w-3" />
          Changes Pending
        </Badge>
      )}

      {/* Sync Controls */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={isSyncing}
            className="flex items-center gap-1"
          >
            {isSyncing ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            Sync
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5 text-sm text-muted-foreground">
            {lastSyncTime ? (
              `Last sync: ${format(lastSyncTime, 'MMM dd, HH:mm')}`
            ) : (
              'Never synced'
            )}
          </div>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={downloadData}
            disabled={!isOnline || isSyncing}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download Data
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={uploadChanges}
            disabled={!isOnline || isSyncing || !hasLocalChanges}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload Changes
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={fullSync}
            disabled={!isOnline || isSyncing}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Full Sync
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={clearLocalData}
            disabled={isSyncing}
            className="flex items-center gap-2 text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Clear Local Data
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};