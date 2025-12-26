import React, { useMemo } from 'react';
import { Plus, UserPlus, Folder, CheckSquare, Clock, AlertTriangle, CheckCircle, Users, Building2, Truck, FileText, RotateCcw, LayoutList } from 'lucide-react';
import { StatCard } from './StatCard';
import { QuickAction } from './QuickAction';
import { PendingTable } from './PendingTable';
import { Task, User, Project, ActionLogEntry, RecurringTaskAction } from '../types';

interface DashboardProps {
  onOpenNewTask: () => void;
  onOpenAddUser: () => void;
  onOpenAddProject: () => void;
  onOpenAddClient: () => void;
  onOpenAddVendor: () => void;
  onFilterChange: (type: string, value: string) => void;
  onNavigate: (tab: string) => void;
  tasks: Task[];
  users: User[];
  projects: Project[];
  actionLogs?: ActionLogEntry[];
  recurringActions?: RecurringTaskAction[];
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  onOpenNewTask, 
  onOpenAddUser,
  onOpenAddProject,
  onOpenAddClient,
  onOpenAddVendor,
  onFilterChange,
  onNavigate,
  tasks, 
  users, 
  projects,
  actionLogs = [],
  recurringActions = []
}) => {
  
  const stats = useMemo(() => {
    const regularTasks = tasks.filter(t => !t.vendor || t.vendor.trim() === '');
    const totalTasks = regularTasks.length;
    const pendingTasks = regularTasks.filter(t => t.status !== 'Completed').length;
    const overdueTasks = regularTasks.filter(t => t.status !== 'Completed' && new Date(t.dueDate) < new Date()).length;
    const completedTasks = regularTasks.filter(t => t.status === 'Completed').length;
    const totalUsers = users.length;
    return { totalTasks, pendingTasks, overdueTasks, completedTasks, totalUsers };
  }, [tasks, users]);

  const assigneeData = useMemo(() => {
    const map = new Map<string, { name: string; total: number; notStarted: number; inProgress: number }>();
    tasks.forEach(task => {
      if (!!(task.vendor && task.vendor.trim() !== '')) return; 
      if (task.status === 'Completed') return;
      const assignees = task.assignees ? task.assignees.split(',').map(s => s.trim()) : ['Unassigned'];
      assignees.forEach(assignee => {
        if (!map.has(assignee)) map.set(assignee, { name: assignee, total: 0, notStarted: 0, inProgress: 0 });
        const entry = map.get(assignee)!;
        entry.total += 1;
        if (task.status === 'Not Yet Started') entry.notStarted += 1;
        if (task.status === 'In Progress' || task.status === 'Started') entry.inProgress += 1;
      });
    });
    return Array.from(map.values());
  }, [tasks]);

  const projectData = useMemo(() => {
    const map = new Map<string, { name: string; total: number; notStarted: number; inProgress: number }>();
    tasks.forEach(task => {
      if (!!(task.vendor && task.vendor.trim() !== '')) return;
      if (task.status === 'Completed') return;
      const projectName = task.project || 'Unknown Project';
      const projectObj = projects.find(p => p.name === projectName);
      const displayName = projectObj ? `${projectName} (${projectObj.client})` : projectName;
      if (!map.has(displayName)) map.set(displayName, { name: displayName, total: 0, notStarted: 0, inProgress: 0 });
      const entry = map.get(displayName)!;
      entry.total += 1;
      if (task.status === 'Not Yet Started') entry.notStarted += 1;
      if (task.status === 'In Progress' || task.status === 'Started') entry.inProgress += 1;
    });
    return Array.from(map.values());
  }, [tasks, projects]);

  const vendorData = useMemo(() => {
    const map = new Map<string, { name: string; total: number; notStarted: number; inProgress: number }>();
    tasks.forEach(task => {
      if (!task.vendor || task.vendor.trim() === '') return;
      if (task.status === 'Completed') return;
      const vendor = task.vendor;
      if (!map.has(vendor)) map.set(vendor, { name: vendor, total: 0, notStarted: 0, inProgress: 0 });
      const entry = map.get(vendor)!;
      entry.total += 1;
      if (task.status === 'Not Yet Started') entry.notStarted += 1;
      if (task.status === 'In Progress' || task.status === 'Started') entry.inProgress += 1;
    });
    return Array.from(map.values());
  }, [tasks]);

  // Data for the 3 new sections
  const dailyUpdates = useMemo(() => {
    const map = new Map<string, number>();
    actionLogs.filter(l => !l.vendor).forEach(log => {
      const names = log.owner.split(',').map(s => s.trim());
      names.forEach(n => map.set(n, (map.get(n) || 0) + 1));
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [actionLogs]);

  const vendorUpdates = useMemo(() => {
    const map = new Map<string, number>();
    actionLogs.filter(l => !!l.vendor).forEach(log => {
      if (log.vendor) map.set(log.vendor, (map.get(log.vendor) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [actionLogs]);

  const recurringUpdates = useMemo(() => {
    const map = new Map<string, number>();
    recurringActions.forEach(action => {
      map.set(action.assignee, (map.get(action.assignee) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [recurringActions]);

  const SectionHeader = ({ title, icon }: { title: string; icon: React.ReactNode }) => (
    <div className="flex items-center gap-2 mb-4">
        <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">{icon}</span>
        <h3 className="text-lg font-black text-blue-800 uppercase tracking-tight">{title}</h3>
    </div>
  );

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex justify-center md:justify-center lg:justify-center">
        <h2 className="text-3xl font-black text-blue-700 uppercase tracking-widest border-b-4 border-blue-600 pb-2">Dashboard Overview</h2>
      </div>

      {/* Quick Actions */}
      <div className="bg-sky-50 p-6 rounded-2xl shadow-md border-2 border-blue-300">
        <SectionHeader title="Quick Control" icon={<LayoutList size={20}/>} />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <QuickAction 
            label="New Task" icon={<Plus size={18} />} 
            colorClass="bg-blue-600 hover:bg-blue-700 text-white" 
            onClick={onOpenNewTask}
          />
          <QuickAction 
            label="Add User" icon={<UserPlus size={18} />} 
            colorClass="bg-indigo-500 hover:bg-indigo-600 text-white" 
            onClick={onOpenAddUser}
          />
          <QuickAction 
            label="Add Vendor" icon={<Truck size={18} />} 
            colorClass="bg-orange-500 hover:bg-orange-600 text-white" 
            onClick={onOpenAddVendor}
          />
          <QuickAction 
            label="Add Client" icon={<Building2 size={18} />} 
            colorClass="bg-pink-500 hover:bg-pink-600 text-white" 
            onClick={onOpenAddClient}
          />
          <QuickAction 
            label="Add Project" icon={<Folder size={18} />} 
            colorClass="bg-emerald-500 hover:bg-emerald-600 text-white" 
            onClick={onOpenAddProject}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="bg-blue-50/70 p-6 rounded-2xl border-2 border-blue-300 shadow-sm">
        <SectionHeader title="Live Statistics" icon={<Clock size={20}/>} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard title="Total Tasks" value={stats.totalTasks} icon={<CheckSquare size={18} />} iconBgColor="bg-blue-100" iconColor="text-blue-600" onClick={() => onNavigate('all-tasks')}/>
            <StatCard title="Pending" value={stats.pendingTasks} icon={<Clock size={18} />} iconBgColor="bg-red-50" iconColor="text-red-600" onClick={() => onNavigate('pending')}/>
            <StatCard title="Overdue" value={stats.overdueTasks} icon={<AlertTriangle size={18} />} iconBgColor="bg-red-100" iconColor="text-red-700" onClick={() => onNavigate('pending')}/>
            <StatCard title="Completed" value={stats.completedTasks} icon={<CheckCircle size={18} />} iconBgColor="bg-green-100" iconColor="text-green-600" onClick={() => onNavigate('completed')}/>
            <StatCard title="Total Users" value={stats.totalUsers} icon={<Users size={18} />} iconBgColor="bg-indigo-100" iconColor="text-indigo-600" onClick={() => onNavigate('users')}/>
        </div>
      </div>

      {/* Primary Tables Section */}
      <div className="grid grid-cols-1 gap-8">
        <PendingTable 
          title="Assigneewise Pending Tasks" data={assigneeData} headerLabel="Employee"
          onRowClick={(name) => onFilterChange('assignee', name)}
          className="bg-sky-50/50"
        />
        <PendingTable 
          title="Projectwise Pending Tasks" data={projectData} headerLabel="Project"
          onRowClick={(name) => onFilterChange('project', name)}
          className="bg-blue-50/50"
        />
        <PendingTable 
          title="Vendorwise Pending Tasks" data={vendorData} headerLabel="Vendor"
          onRowClick={(name) => onFilterChange('vendor', name)}
          className="bg-indigo-50/30"
        />
      </div>

      {/* New Update Summary Tables Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-cyan-50 p-6 rounded-2xl border-2 border-blue-300 shadow-sm flex flex-col h-full">
             <SectionHeader title="Daily Task Updates" icon={<FileText size={18}/>} />
             <div className="overflow-hidden border border-blue-200 rounded-xl bg-white flex-1">
                 <table className="w-full text-left">
                    <thead className="bg-blue-600 text-white text-[10px] uppercase font-bold">
                        <tr><th className="px-4 py-2">Employee</th><th className="px-4 py-2 text-center">Updates</th></tr>
                    </thead>
                    <tbody className="divide-y divide-blue-100">
                        {dailyUpdates.map((u, i) => (
                           <tr key={i} onClick={() => onFilterChange('employee-log', u.name)} className="hover:bg-blue-50 cursor-pointer transition-colors border-l-4 border-transparent hover:border-blue-600">
                              <td className="px-4 py-2.5 text-xs font-bold text-blue-900">{u.name}</td>
                              <td className="px-4 py-2.5 text-xs text-center font-black text-blue-600">{u.count}</td>
                           </tr>
                        ))}
                    </tbody>
                 </table>
             </div>
          </div>

          <div className="bg-emerald-50/30 p-6 rounded-2xl border-2 border-blue-300 shadow-sm flex flex-col h-full">
             <SectionHeader title="Vendor Task Updates" icon={<Building2 size={18}/>} />
             <div className="overflow-hidden border border-blue-200 rounded-xl bg-white flex-1">
                 <table className="w-full text-left">
                    <thead className="bg-emerald-600 text-white text-[10px] uppercase font-bold">
                        <tr><th className="px-4 py-2">Vendor</th><th className="px-4 py-2 text-center">Updates</th></tr>
                    </thead>
                    <tbody className="divide-y divide-blue-100">
                        {vendorUpdates.map((u, i) => (
                           <tr key={i} onClick={() => onFilterChange('vendor-log', u.name)} className="hover:bg-emerald-50 cursor-pointer transition-colors border-l-4 border-transparent hover:border-emerald-600">
                              <td className="px-4 py-2.5 text-xs font-bold text-emerald-900">{u.name}</td>
                              <td className="px-4 py-2.5 text-xs text-center font-black text-emerald-600">{u.count}</td>
                           </tr>
                        ))}
                    </tbody>
                 </table>
             </div>
          </div>

          <div className="bg-indigo-50/50 p-6 rounded-2xl border-2 border-blue-300 shadow-sm flex flex-col h-full">
             <SectionHeader title="Recurring Updates" icon={<RotateCcw size={18}/>} />
             <div className="overflow-hidden border border-blue-200 rounded-xl bg-white flex-1">
                 <table className="w-full text-left">
                    <thead className="bg-indigo-600 text-white text-[10px] uppercase font-bold">
                        <tr><th className="px-4 py-2">Assignee</th><th className="px-4 py-2 text-center">Updates</th></tr>
                    </thead>
                    <tbody className="divide-y divide-blue-100">
                        {recurringUpdates.map((u, i) => (
                           <tr key={i} onClick={() => onFilterChange('recurring-log', u.name)} className="hover:bg-indigo-50 cursor-pointer transition-colors border-l-4 border-transparent hover:border-indigo-600">
                              <td className="px-4 py-2.5 text-xs font-bold text-indigo-900">{u.name}</td>
                              <td className="px-4 py-2.5 text-xs text-center font-black text-indigo-600">{u.count}</td>
                           </tr>
                        ))}
                    </tbody>
                 </table>
             </div>
          </div>
      </div>
    </div>
  );
};