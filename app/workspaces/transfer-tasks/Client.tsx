"use client";

import React, { useState, useMemo } from 'react';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { ArrowRightLeft, Search, Users, AlertTriangle } from 'lucide-react';
import { moveTasksInBulk } from '@/lib/actions/tasks';
import { useRouter } from 'next/navigation';
import { AppTable, AppTableHeader, AppTableBody, AppTableRow, AppTableHead, AppTableCell } from "@/components/ui/AppTable";


export default function TransferTasksClient({ initialTasks, workspaces, allUsers, wsMembers }: any) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [targetWorkspaceId, setTargetWorkspaceId] = useState('');
  const [targetSubworkspaceId, setTargetSubworkspaceId] = useState('');
  const [newOwnerId, setNewOwnerId] = useState('');
  const [newExecutors, setNewExecutors] = useState<string[]>([]);
  const [newWatchers, setNewWatchers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [filterWorkspaceId, setFilterWorkspaceId] = useState('');
  const [filterSubworkspaceId, setFilterSubworkspaceId] = useState('');

  // Filter tasks based on search and workspace filters
  const filteredTasks = useMemo(() => {
    return initialTasks.filter((t: any) => {
      const matchesSearch = (t.subject || t.task_code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (t.workspace?.workspace_name || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesWs = true;
      if (filterSubworkspaceId) {
         matchesWs = t.workspace_id === filterSubworkspaceId;
      } else if (filterWorkspaceId) {
         const validWsIds = workspaces.filter((w: any) => w.id === filterWorkspaceId || w.parent_workspace_id === filterWorkspaceId).map((w: any) => w.id);
         matchesWs = validWsIds.includes(t.workspace_id);
      }
      
      return matchesSearch && matchesWs;
    });
  }, [initialTasks, searchTerm, filterWorkspaceId, filterSubworkspaceId, workspaces]);

  // Handle task selection
  const toggleTaskSelection = (id: string) => {
    const next = new Set(selectedTaskIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedTaskIds(next);
  };

  const toggleAll = () => {
    if (selectedTaskIds.size === filteredTasks.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(filteredTasks.map((t: any) => t.id)));
    }
  };

  const [targetStakeholders, setTargetStakeholders] = useState<any[]>([]);
  const [checkingScope, setCheckingScope] = useState(false);

  // Fetch stakeholders dynamically whenever target changes
  React.useEffect(() => {
    const targetId = targetSubworkspaceId || targetWorkspaceId;
    if (!targetId) {
      setTargetStakeholders([]);
      return;
    }
    let isMounted = true;
    setCheckingScope(true);
    
    import('@/lib/actions/workspaces').then(m => {
      m.fetchWorkspaceStakeholders(targetId).then(stakeholders => {
        if (isMounted) {
          setTargetStakeholders(stakeholders);
          setCheckingScope(false);
        }
      });
    }).catch(console.error);
    
    return () => { isMounted = false; };
  }, [targetWorkspaceId, targetSubworkspaceId]);

  // Check if current assignees are valid in the selected target
  const checkAssigneeValidity = () => {
    if (!targetWorkspaceId || checkingScope) return { isValid: true, invalidTaskAssignees: [] };

    const validMemberIds = targetStakeholders.map((s: any) => s.id);

    const invalid = [];
    for (const taskId of Array.from(selectedTaskIds)) {
      const task = initialTasks.find((t: any) => t.id === taskId);
      if (task && task.owner_id) { // using owner_id for strict checking of primary assignee
        if (!validMemberIds.includes(task.owner_id)) {
          invalid.push(task);
        }
      }
    }

    return {
      isValid: invalid.length === 0,
      invalidTaskAssignees: invalid
    };
  };

  const validity = useMemo(() => checkAssigneeValidity(), [targetWorkspaceId, targetSubworkspaceId, targetStakeholders, selectedTaskIds, checkingScope]);

  // Get valid users for target dropdown
  const targetWorkspaceUsers = targetStakeholders;

  const handleTransfer = async () => {
    if (!targetWorkspaceId) return;

    // Validate that we have a new owner if it's required
    if (!validity.isValid && !newOwnerId) {
      alert("Please select a new owner for the tasks since current owners don't have access.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        taskIds: Array.from(selectedTaskIds),
        targetWorkspaceId,
        targetSubWorkspaceId: targetSubworkspaceId,
      };

      if (!validity.isValid && newOwnerId) {
        payload.newOwnerId = newOwnerId;
      }
      
      if (newExecutors.length > 0 || newWatchers.length > 0) {
        payload.newParticipantIds = [
          ...newExecutors.map(id => ({ user_id: id, participation_role: 'EXECUTOR' })),
          ...newWatchers.map(id => ({ user_id: id, participation_role: 'WATCHER' }))
        ];
      }

      const res = await moveTasksInBulk(payload);
      if (res.error) {
        alert("Error transferring tasks: " + res.error);
      } else {
        setIsTransferModalOpen(false);
        setSelectedTaskIds(new Set());
        setTargetWorkspaceId('');
        setNewOwnerId('');
        router.refresh(); // Refresh the page data
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tasks..."
              className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-xl text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select 
            className="bg-background border border-input rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary w-48"
            value={filterWorkspaceId}
            onChange={(e) => {
              setFilterWorkspaceId(e.target.value);
              setFilterSubworkspaceId('');
            }}
          >
            <option value="">All Workspaces</option>
            {workspaces.filter((w: any) => !w.parent_workspace_id).map((ws: any) => (
              <option key={ws.id} value={ws.id}>{ws.workspace_name || ws.name}</option>
            ))}
          </select>

          <select 
            className="bg-background border border-input rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50 w-48"
            value={filterSubworkspaceId}
            onChange={(e) => setFilterSubworkspaceId(e.target.value)}
            disabled={!filterWorkspaceId}
          >
            <option value="">All Subworkspaces</option>
            {workspaces.filter((w: any) => w.parent_workspace_id === filterWorkspaceId).map((ws: any) => (
              <option key={ws.id} value={ws.id}>{ws.workspace_name || ws.name}</option>
            ))}
          </select>
        </div>
        <div className="ml-4 shrink-0">
          <AppButton 
            variant="primary" 
            leftIcon={<ArrowRightLeft className="h-4 w-4" />}
            disabled={selectedTaskIds.size === 0}
            onClick={() => setIsTransferModalOpen(true)}
          >
            Transfer {selectedTaskIds.size > 0 ? `(${selectedTaskIds.size})` : ''}
          </AppButton>
        </div>
      </div>

      {/* Table */}
      <AppCard className="overflow-hidden border border-border">
        <div className="overflow-x-auto">
          <AppTable className="w-full text-left text-base text-muted-foreground">
            <AppTableHeader className="bg-muted border-b border-border text-xs uppercase text-muted-foreground">
              <AppTableRow>
                <AppTableHead className="px-4 py-3 w-10">
                  <input 
                    type="checkbox" 
                    className="rounded border-input bg-transparent text-primary focus:ring-primary"
                    checked={selectedTaskIds.size > 0 && selectedTaskIds.size === filteredTasks.length}
                    onChange={toggleAll}
                  />
                </AppTableHead>
                <AppTableHead className="px-4 py-3">Task Name</AppTableHead>
                <AppTableHead className="px-4 py-3">Workspace</AppTableHead>
                <AppTableHead className="px-4 py-3">Status</AppTableHead>
                <AppTableHead className="px-4 py-3">Assignee</AppTableHead>
              </AppTableRow>
            </AppTableHeader>
            <AppTableBody className="divide-y divide-border bg-card">
              {filteredTasks.map((task: any) => (
                <AppTableRow key={task.id} className="hover:bg-muted/50 transition-colors">
                  <AppTableCell className="px-4 py-3">
                    <input 
                      type="checkbox" 
                      className="rounded border-input bg-transparent text-primary focus:ring-primary"
                      checked={selectedTaskIds.has(task.id)}
                      onChange={() => toggleTaskSelection(task.id)}
                    />
                  </AppTableCell>
                  <AppTableCell className="px-4 py-3 font-medium text-foreground">
                    {task.subject || task.task_code || 'Untitled'}
                  </AppTableCell>
                  <AppTableCell className="px-4 py-3">
                    <div className="flex flex-col">
                      <span>{task.workspace?.workspace_name || 'No Workspace'}</span>
                    </div>
                  </AppTableCell>
                  <AppTableCell className="px-4 py-3">
                    {task.status?.status_name || '-'}
                  </AppTableCell>
                  <AppTableCell className="px-4 py-3 flex items-center space-x-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {task.owner_id 
                        ? allUsers.find((u: any) => u.id === task.owner_id)?.full_name || 'Unknown User' 
                        : 'Unassigned'}
                    </span>
                  </AppTableCell>
                </AppTableRow>
              ))}
              {filteredTasks.length === 0 && (
                <AppTableRow>
                  <AppTableCell colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No tasks found.
                  </AppTableCell>
                </AppTableRow>
              )}
            </AppTableBody>
          </AppTable>
        </div>
      </AppCard>

      {/* Transfer Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 border-b border-border flex-shrink-0">
              <h2 className="text-xl font-bold text-foreground">Transfer Tasks</h2>
              <p className="text-sm text-muted-foreground mt-1">Move {selectedTaskIds.size} selected tasks to a new workspace.</p>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Target Workspace (Root)</label>
                <select
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  value={targetWorkspaceId}
                  onChange={(e) => {
                    setTargetWorkspaceId(e.target.value);
                    setTargetSubworkspaceId('');
                    setNewOwnerId(''); 
                    setNewExecutors([]); 
                    setNewWatchers([]);
                  }}
                >
                  <option value="">Select a workspace...</option>
                  {workspaces.filter((w: any) => !w.parent_workspace_id).map((ws: any) => (
                    <option key={ws.id} value={ws.id}>{ws.workspace_name || ws.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Subworkspace (Optional)</label>
                <select
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary disabled:opacity-50"
                  value={targetSubworkspaceId}
                  onChange={(e) => {
                    setTargetSubworkspaceId(e.target.value);
                    setNewOwnerId(''); 
                    setNewExecutors([]); 
                    setNewWatchers([]);
                  }}
                  disabled={!targetWorkspaceId}
                >
                  <option value="">-- Root Level (No Subworkspace) --</option>
                  {workspaces.filter((w: any) => w.parent_workspace_id === targetWorkspaceId).map((ws: any) => (
                    <option key={ws.id} value={ws.id}>{ws.workspace_name || ws.name}</option>
                  ))}
                </select>
              </div>

              {targetWorkspaceId && !validity.isValid && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mt-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-yellow-500">Assignees Incompatible</h4>
                      <p className="text-xs text-yellow-500/80 mt-1">
                        {validity.invalidTaskAssignees.length} tasks have assignees that do not belong to the target workspace. Please select a new assignee.
                      </p>
                      
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-amber-600 dark:text-amber-500/90 mb-1">New Assignee (Owner)</label>
                        <select
                          className="w-full bg-background border border-amber-500/20 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amber-500"
                          value={newOwnerId}
                          onChange={(e) => setNewOwnerId(e.target.value)}
                        >
                          <option value="">Select a new user...</option>
                          {targetWorkspaceUsers.map((u: any) => (
                            <option key={u.id} value={u.id}>{u.full_name}</option>
                          ))}
                        </select>
                      </div>

                    </div>
                  </div>
                </div>
              )}

              {targetWorkspaceId && (
                <div className="pt-4 mt-4 border-t border-border">
                  <h3 className="text-sm font-medium text-foreground mb-3">Reassign Participants (Optional)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Executives Column */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-medium text-muted-foreground">Executives</label>
                        <AppButton variant="secondary" 
                          className="text-[10px] text-primary hover:underline"
                          onClick={() => {
                            if (newExecutors.length === targetWorkspaceUsers.length) setNewExecutors([]);
                            else setNewExecutors(targetWorkspaceUsers.map((u: any) => u.id));
                          }}
                        >
                          {newExecutors.length === targetWorkspaceUsers.length ? 'Deselect All' : 'Select All'}
                        </AppButton>
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1 scrollbar-thin bg-background border border-border rounded-lg p-2">
                        {targetWorkspaceUsers.map((s: any) => (
                          <label key={s.id} className="flex items-center gap-2 text-xs text-foreground p-1 hover:bg-muted rounded cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={newExecutors.includes(s.id)}
                              onChange={e => {
                                if(e.target.checked) setNewExecutors([...newExecutors, s.id]);
                                else setNewExecutors(newExecutors.filter(id => id !== s.id));
                              }}
                              className="accent-primary rounded h-3 w-3"
                            />
                            {s.full_name}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Watchers Column */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-medium text-muted-foreground">Watchers</label>
                        <AppButton variant="secondary" 
                          className="text-[10px] text-primary hover:underline"
                          onClick={() => {
                            if (newWatchers.length === targetWorkspaceUsers.length) setNewWatchers([]);
                            else setNewWatchers(targetWorkspaceUsers.map((u: any) => u.id));
                          }}
                        >
                          {newWatchers.length === targetWorkspaceUsers.length ? 'Deselect All' : 'Select All'}
                        </AppButton>
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1 scrollbar-thin bg-background border border-border rounded-lg p-2">
                        {targetWorkspaceUsers.map((s: any) => (
                          <label key={s.id} className="flex items-center gap-2 text-xs text-foreground p-1 hover:bg-muted rounded cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={newWatchers.includes(s.id)}
                              onChange={e => {
                                if(e.target.checked) setNewWatchers([...newWatchers, s.id]);
                                else setNewWatchers(newWatchers.filter(id => id !== s.id));
                              }}
                              className="accent-primary rounded h-3 w-3"
                            />
                            {s.full_name}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border bg-muted/30 flex justify-end space-x-3 flex-shrink-0">
              <AppButton variant="secondary" onClick={() => setIsTransferModalOpen(false)}>
                Cancel
              </AppButton>
              <AppButton 
                variant="primary" 
                onClick={handleTransfer}
                disabled={!targetWorkspaceId || (!validity.isValid && !newOwnerId) || isSubmitting}
                isLoading={isSubmitting}
              >
                Confirm Transfer
              </AppButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
