
import React from 'react';
import { X, Download, Calendar, User, Users, Clock, Tag, Briefcase, History } from 'lucide-react';
import { ActionLogEntry, Task } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatToIndianDate, formatToIndianDateTime } from '../App';

interface TaskHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  logs: ActionLogEntry[];
}

export const TaskHistoryModal: React.FC<TaskHistoryModalProps> = ({ isOpen, onClose, task, logs }) => {
  if (!isOpen || !task) return null;

  const taskLogs = logs.filter(log => {
    const logTaskId = Number(log.taskId || 0);
    const currentTaskId = Number(task.id || 0);
    return logTaskId > 0 && logTaskId === currentTaskId;
  });
  
  const isVendorTask = !!(task.vendor && task.vendor.trim() !== '');
  
  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Task History', 14, 20);
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Updates for: ${task.title}`, 14, 30);

    let tableColumn: string[] = [];
    let tableRows: any[] = [];

    if (isVendorTask) {
        tableColumn = ["Task Date", "Update Date", "Status", "Remarks", "Owner", "Vendor"];
        tableRows = taskLogs.map(log => [
            formatToIndianDate(log.taskDate),
            formatToIndianDate(log.updateDate),
            log.status,
            log.remarks || '-',
            log.owner,
            log.vendor || '-'
        ]);
    } else {
        tableColumn = ["Task Date", "Update Date", "Status", "Remarks", "Owner", "Assignees", "Project"];
        tableRows = taskLogs.map(log => [
            formatToIndianDate(log.taskDate),
            formatToIndianDate(log.updateDate),
            log.status,
            log.remarks || '-',
            log.owner,
            log.assignees,
            log.project
        ]);
    }

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`Task_History_${task.id}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200 border-2 border-blue-500">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-blue-100 flex-shrink-0">
          <div>
            <h2 className="text-xl font-extrabold text-blue-600">Task Details & History</h2>
            <div className="flex flex-wrap items-center gap-3 mt-2">
                <div className="bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg flex items-center gap-3">
                   <span className="text-sm font-bold text-black">{task.title}</span>
                   <button onClick={handleDownloadPDF} className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors shadow-sm">
                      <Download size={16} />
                   </button>
                </div>
                {task.category && <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-black bg-blue-50/50 border border-blue-100 px-2 py-0.5 rounded"><Tag size={12} className="text-blue-500"/> {task.category}</span>}
                <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-black bg-blue-50/50 border border-blue-100 px-2 py-0.5 rounded"><Briefcase size={12} className="text-blue-500"/> {task.project}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-auto p-4 md:p-6 space-y-6">
          {/* Summary Card Area */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-gray-50/50 border border-blue-100 p-4 rounded-xl space-y-1">
                 <span className="text-[10px] font-extrabold uppercase text-blue-400">Current Status</span>
                 <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-blue-600 text-white rounded-full text-xs font-bold uppercase tracking-wider">{task.status}</span>
                    <span className="text-xs text-black font-bold flex items-center gap-1"><Clock size={12} className="text-blue-500"/> {formatToIndianDate(task.lastUpdateDate || '')}</span>
                 </div>
              </div>
              <div className="bg-gray-50/50 border border-blue-100 p-4 rounded-xl space-y-1">
                 <span className="text-[10px] font-extrabold uppercase text-blue-400">Owner & Assignees</span>
                 <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs text-black font-bold uppercase"><User size={12} className="text-blue-500"/> {task.owner}</div>
                    {!isVendorTask && <div className="flex items-center gap-1.5 text-xs text-black font-bold uppercase"><Users size={12} className="text-blue-500"/> {task.assignees}</div>}
                 </div>
              </div>
              <div className="bg-gray-50/50 border border-blue-100 p-4 rounded-xl space-y-1">
                 <span className="text-[10px] font-extrabold uppercase text-blue-400">Task Dates</span>
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-black font-bold"><Calendar size={12} className="text-blue-500"/> {formatToIndianDate(task.date)}</div>
                    <div className="flex items-center gap-1.5 text-xs text-black font-bold"><Calendar size={12} className="text-blue-500"/> {formatToIndianDate(task.dueDate)}</div>
                 </div>
              </div>
          </div>

          {/* Detailed History Table */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-black uppercase tracking-widest flex items-center gap-2">
               <History className="text-blue-500" size={16} /> UPDATE HISTORY LOG
            </h3>
            <div className="border border-blue-200 rounded-xl overflow-x-auto shadow-sm">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="bg-blue-600">
                  <tr className="border-b border-blue-700">
                    <th className="px-6 py-4 text-[10px] font-bold text-white uppercase tracking-widest border-r border-blue-500 last:border-r-0">Task Date</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-white uppercase tracking-widest border-r border-blue-500 last:border-r-0">Update Date</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-white uppercase tracking-widest border-r border-blue-500 last:border-r-0">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-white uppercase tracking-widest border-r border-blue-500 last:border-r-0">Remarks</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-white uppercase tracking-widest border-r border-blue-500 last:border-r-0">Owner(s)</th>
                    {isVendorTask ? (
                        <th className="px-6 py-4 text-[10px] font-bold text-white uppercase tracking-widest">Vendor</th>
                    ) : (
                        <>
                          <th className="px-6 py-4 text-[10px] font-bold text-white uppercase tracking-widest border-r border-blue-500">Assignee(s)</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-white uppercase tracking-widest">Project</th>
                        </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-50">
                  {taskLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-4 text-xs text-black font-bold whitespace-nowrap border-r border-blue-50 last:border-r-0">{formatToIndianDate(log.taskDate)}</td>
                      <td className="px-6 py-4 text-xs text-black font-bold whitespace-nowrap border-r border-blue-50 last:border-r-0">{formatToIndianDate(log.updateDate)}</td>
                      <td className="px-6 py-4 text-xs border-r border-blue-50 last:border-r-0">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-[10px] font-bold uppercase whitespace-nowrap border border-blue-200">
                            {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-black max-w-[300px] font-medium border-r border-blue-50 last:border-r-0">"{log.remarks}"</td>
                      <td className="px-6 py-4 text-xs text-black font-bold uppercase border-r border-blue-50 last:border-r-0">{log.owner}</td>
                      {isVendorTask ? (
                          <td className="px-6 py-4 text-xs text-black font-bold uppercase">{log.vendor || '-'}</td>
                      ) : (
                          <>
                              <td className="px-6 py-4 text-xs text-black font-bold border-r border-blue-50">{log.assignees}</td>
                              <td className="px-6 py-4 text-xs text-black font-bold max-w-[150px] truncate" title={log.project}>{log.project}</td>
                          </>
                      )}
                    </tr>
                  ))}
                  {taskLogs.length === 0 && (
                    <tr>
                      <td colSpan={isVendorTask ? 6 : 7} className="px-6 py-12 text-center text-black font-bold opacity-40 uppercase tracking-widest text-xs bg-gray-50/20">
                        No update history found for this task.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-blue-100 bg-blue-50/20 rounded-b-xl flex justify-end flex-shrink-0">
          <button onClick={onClose} className="px-8 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all uppercase shadow-lg shadow-blue-200">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
