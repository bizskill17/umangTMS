/**
 * TaskPro - BizSkill Automation Backend
 * Google Sheets Integration Script
 */


function testWhatsAppConnection() {
  const config = getMASConfig();
  const testMsg = "🔍 *TaskPro Connection Test*\nTesting WhatsApp API configuration.";
  
  Logger.log("Starting Manual Test...");
  Logger.log(`Using Username: ${config.username}`);
      if (config.defaultGroup) {
    Logger.log(`Attempting to send to Group: ${config.defaultGroup}`);
    mobileNumber = "9864023964";
    sendpersonalMessage(testMsg,  mobileNumber, config.username, config.password);
    sendgroupMessage(testMsg, config.defaultGroup, config.username, config.password)
  } else {
    Logger.log("No default group ID found in AppSettings.");
  }
}

const SS = SpreadsheetApp.getActiveSpreadsheet();

// REPLACE your existing sheetToJSON with this:
function sheetToJSON(sheetName) {
  const sheet = SS.getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  
  const headers = data.shift();
  return data.map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      let val = row[i];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), "dd-MM-yyyy");
      }
      // FIX: Force "ID" header to always be lowercase "id"
      let key = (h === 'ID' || h === 'id') ? 'id' : h.charAt(0).toLowerCase() + h.slice(1);
      obj[key] = val;
    });
    return obj;
  });
}

function doGet(e) {
  const action = e.parameter.action;
  
  try {
    let result;
    if (action === 'init') {
      // Fetch all master data for the app startup
      result = {
        mainTasks: sheetToJSON('MainTasks'),
        vendorTasks: sheetToJSON('VendorTasks'),
        users: sheetToJSON('Users'),
        projects: sheetToJSON('Projects'),
        clients: sheetToJSON('Clients'),
        vendors: sheetToJSON('Vendors'),
        categories: sheetToJSON('Categories'),
        vendorCategories: sheetToJSON('VendorCategories'),
        designations: sheetToJSON('Designations'),
        actionLogs: [...sheetToJSON('MainTaskActionLog'), ...sheetToJSON('VendorTaskActionLog')],
        recurringTasks: sheetToJSON('RecurringTasks'),
        recurringActions: sheetToJSON('RecurringActions'),
        settings: sheetToJSON('AppSettings')[0] || {}
      };
    } else {
      result = sheetToJSON(action); // e.g. action=Users
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true, data: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  const params = JSON.parse(e.postData.contents);
  const action = params.action;
  const payload = params.data;
  
  try {
    let result;
    switch (action) {
      case 'addTask':
        result = handleAddTask(payload);
        break;
      case 'updateTask':
        result = handleUpdateTask(payload);
        break;
      case 'addMaster':
        result = handleAddMaster(params.target, payload);
        if (params.target === 'RecurringTasks') {
          handleRecurringTaskNotification(payload, true);
        }
        break;
      case 'updateMaster':
        result = handleUpdateMaster(params.target, payload);
        if (params.target === 'RecurringTasks' || params.target === 'RecurringActions') {
          handleRecurringTaskNotification(payload, false);
        }
        break;
      case 'deleteRecord':
        result = handleDeleteRecord(params.target, payload.id);
        break;
      default:
        throw new Error("Invalid action: " + action);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleAddTask(data) {
  const isVendor = !!(data.vendor && data.vendor.trim() !== '');
  const sheetName = isVendor ? 'VendorTasks' : 'MainTasks';
  const sheet = SS.getSheetByName(sheetName);
  
  const id = new Date().getTime();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Normalizing incoming data keys for robust matching
  const normalizedData = {};
  Object.keys(data).forEach(k => {
    normalizedData[k.toLowerCase().replace(/[^a-z0-9]/g, '')] = data[k];
  });

  const rowData = headers.map(h => {
    const hClean = h.toString().trim();
    const hLower = hClean.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (hLower === 'id') return id;
    if (hLower === 'date') return new Date(); // New tasks always get current date
    if (hLower === 'status') return 'Not Yet Started';
    if (hLower === 'lastupdatedate') return new Date();
    
    // Priority field mappings for Vendor tasks
    if (hLower === 'vendorcategory') {
      const v = data.vendorCategory !== undefined ? data.vendorCategory : (data.category !== undefined && data.category !== "" ? data.category : "");
      if (v !== undefined && v !== null) return v;
    }
    
    if (hLower === 'clientname') return data.clientName || "";
    if (hLower === 'duedate') return data.dueDate || "";
    if (hLower === 'lastupdateremarks') return data.remarks || "";
    
    // General matching using normalized keys
    if (normalizedData[hLower] !== undefined) return normalizedData[hLower];

    // CamelCase/PascalCase fallback matching on original object
    let key = hClean.charAt(0).toLowerCase() + hClean.slice(1);
    if (data[key] !== undefined) return data[key];
    
    return "";
  });
  
  sheet.appendRow(rowData);

  try {
    const config = getMASConfig();
    const creationTime = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy hh:mm a");
    
    let msg;
    if (isVendor) {
      msg = `*New Vendor Task*\n\n` +
            `*Task:* ${data.title || data.task}\n` +
            `*Vendor:* ${data.vendor}\n` +
            `*Category:* ${data.vendorCategory || '-'}\n` +
            `*Remarks:* ${data.remarks || '-'}\n` +
            `*Due Date:* ${formatDateDMY(data.dueDate)}\n` +
            `*Task Owner:* ${data.owner}\n` +
            `*Created At:* ${creationTime}`;
    } else {
      msg = `*New Task Assigned*\n\n` +
            `*Task:* ${data.title || data.task}\n` +
            `*Client:* ${data.clientName || '-'}\n` +
            `*Project:* ${data.project}\n` +
            `*Remarks:* ${data.remarks || '-'}\n` +
            `*Due Date:* ${formatDateDMY(data.dueDate)}\n` +
            `*Assignees:* ${data.assignees || 'Not assigned'}\n` +
            `*Task Owner:* ${data.owner}\n` +
            `*Created At:* ${creationTime}`;
    }

    if (isVendor) {
      if (data.vendor) {
        const vendorMobile = getVendorMobile(data.vendor);
        if (vendorMobile && String(vendorMobile).trim().length === 10) {
          sendpersonalMessage(msg, vendorMobile, config.username, config.password);
        }
      }
    } else {
      if (data.assignees) {
        data.assignees.split(',').forEach(name => {
          const mobile = getUserMobile(name.trim());
          if (mobile && String(mobile).trim().length === 10) {
            sendpersonalMessage(msg, mobile, config.username, config.password);
          }
        });
      }
    }

    if (data.project) {
      sendToProjectWhatsAppGroup(data.project, msg);
      sendToProjectTelegramGroup(data.project, msg);
    }
  } catch (e) {
    Logger.log("Notification Error: " + e.message);
  }

  return { id: id };
}

function handleUpdateTask(data) {
  const isVendor = !!(data.vendor && data.vendor.trim() !== '');
  const sheetName = isVendor ? 'VendorTasks' : 'MainTasks';
  const logSheetName = isVendor ? 'VendorTaskActionLog' : 'MainTaskActionLog';
  
  const sheet = SS.getSheetByName(sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  
  let rowIndex = -1;
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] == data.id) {
      rowIndex = i + 1;
      break;
    }
  }
  
  if (rowIndex === -1) throw new Error("Task ID not found");
  
  // Robust data normalization for matching
  const normalizedData = {};
  Object.keys(data).forEach(k => {
    normalizedData[k.toLowerCase().replace(/[^a-z0-9]/g, '')] = data[k];
  });

  headers.forEach((h, i) => {
    const hClean = h.toString().trim();
    const hLower = hClean.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Skip immutable fields
    if (hLower === 'id' || hLower === 'date') return;
    
    if (hLower === 'lastupdatedate') {
      sheet.getRange(rowIndex, i + 1).setValue(new Date());
      return;
    }

    // Explicit Priority Mappings
    if (hLower === 'vendorcategory' && data.vendorCategory !== undefined) {
      sheet.getRange(rowIndex, i + 1).setValue(data.vendorCategory);
      return;
    }
    if (hLower === 'lastupdateremarks' && data.lastUpdateRemarks !== undefined) {
      sheet.getRange(rowIndex, i + 1).setValue(data.lastUpdateRemarks);
      return;
    }

    // Match by normalized key
    if (normalizedData[hLower] !== undefined) {
      sheet.getRange(rowIndex, i + 1).setValue(normalizedData[hLower]);
    } else {
      // Standard key matching fallback
      let key = hClean.charAt(0).toLowerCase() + hClean.slice(1);
      if (data[key] !== undefined) {
        sheet.getRange(rowIndex, i + 1).setValue(data[key]);
      }
    }
  });
  
  const logSheet = SS.getSheetByName(logSheetName);
  const logHeaders = logSheet.getRange(1, 1, 1, logSheet.getLastColumn()).getValues()[0];
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy hh:mm a");
  
  const logRow = logHeaders.map(h => {
    if (h === 'ID') return new Date().getTime();
    if (h === 'TaskID') return data.id;
    if (h === 'TaskTitle') return data.title || values[rowIndex-1][headers.indexOf('Title')] || values[rowIndex-1][headers.indexOf('task')] || "";
    if (h === 'UpdateDate') return timestamp;
    if (h === 'Remarks') return data.lastUpdateRemarks || data.remarks || "-";
    
    const hClean = h.toString().trim();
    const hLower = hClean.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (normalizedData[hLower] !== undefined) return normalizedData[hLower];

    let key = hClean.charAt(0).toLowerCase() + hClean.slice(1);
    return data[key] || values[rowIndex-1][headers.indexOf(h)] || "";
  });
  
  logSheet.appendRow(logRow);
  
  try {
    const config = getMASConfig();
    const taskTitle = data.title || values[rowIndex-1][headers.findIndex(h => h.toLowerCase().includes('title'))];
    const taskStatus = data.status || values[rowIndex-1][headers.findIndex(h => h.toLowerCase().includes('status'))];
    const taskRemarks = data.lastUpdateRemarks || data.remarks || "-";
    const taskOwner = data.owner || values[rowIndex-1][headers.findIndex(h => h.toLowerCase().includes('owner'))];
    const updateTimestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy hh:mm a");
    
    let updateMsg = `📝 *Task Updated*\n\n` +
                 `*Task:* ${taskTitle}\n` +
                 `*Status:* ${taskStatus}\n` +
                 `*Remarks:* ${taskRemarks}\n` +
                 `*Updated At:* ${updateTimestamp}\n\n`;
  
    if (taskOwner) {
      const ownerMobile = getUserMobile(taskOwner);
      if (ownerMobile && String(ownerMobile).trim().length === 10) {
        sendpersonalMessage(updateMsg, ownerMobile, config.username, config.password);
      }
    }

    const projectName = data.project || values[rowIndex-1][headers.findIndex(h => h.toLowerCase().includes('project'))];
    if (projectName) {
      sendToProjectWhatsAppGroup(projectName, updateMsg);
      sendToProjectTelegramGroup(projectName, updateMsg);
    }
  } catch (e) {
    Logger.log("Update Notification Error: " + e.message);
  }
  
  return true;
}

function handleAddMaster(target, data) {
  const sheet = SS.getSheetByName(target);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const id = new Date().getTime();
  
  const rowData = headers.map(h => {
    if (h === 'ID') return id;
    if (h === 'IsActive') return true;
    let key = h.charAt(0).toLowerCase() + h.slice(1);
    return data[key] || "";
  });
  
  sheet.appendRow(rowData);
  return { id: id };
}

function handleUpdateMaster(target, data) {
  const sheet = SS.getSheetByName(target);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  
  let rowIndex = -1;
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] == data.id) {
      rowIndex = i + 1;
      break;
    }
  }
  
  if (rowIndex === -1) throw new Error("Record ID not found");
  
  headers.forEach((h, i) => {
    let key = h.charAt(0).toLowerCase() + h.slice(1);
    if (data[key] !== undefined) {
      sheet.getRange(rowIndex, i + 1).setValue(data[key]);
    }
  });
  return true;
}

function handleDeleteRecord(target, id) {
  const sheet = SS.getSheetByName(target);
  const values = sheet.getDataRange().getValues();
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] == id) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

function formatDateDMY(dateValue) {
  if (!dateValue) return "";
  let date;
  if (dateValue instanceof Date) date = dateValue;
  else if (typeof dateValue === 'string' || typeof dateValue === 'number') date = new Date(dateValue);
  else return String(dateValue);
  if (isNaN(date.getTime())) return String(dateValue);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function getVendorMobile(vendorName) {
  try {
    const vendors = sheetToJSON('Vendors');
    const vendor = vendors.find(v => v.name && v.name.trim().toLowerCase() === vendorName.trim().toLowerCase());
    if (vendor && vendor.mobile) {
      const mobileDigits = String(vendor.mobile).replace(/\D/g, '');
      if (mobileDigits.length === 10) return mobileDigits;
      if (mobileDigits.length === 12 && mobileDigits.startsWith('91')) return mobileDigits.substring(2);
    }
    return null;
  } catch (e) {
    return null;
  }
}

function getProjectWhatsAppGroup(projectName) {
  try {
    const projects = sheetToJSON('Projects');
    const project = projects.find(p => p.name && p.name.trim().toLowerCase() === projectName.trim().toLowerCase());
    return (project && project.whatsappGroupId) || '';
  } catch (e) {
    return '';
  }
}

function getProjectTelegramGroup(projectName) {
  try {
    const projects = sheetToJSON('Projects');
    const project = projects.find(p => p.name && p.name.trim().toLowerCase() === projectName.trim().toLowerCase());
    return (project && project.telegramGroupId) || '';
  } catch (e) {
    return '';
  }
}

function sendToProjectWhatsAppGroup(projectName, message) {
  try {
    const config = getMASConfig();
    const groupId = getProjectWhatsAppGroup(projectName);
    if (groupId) {
      sendgroupMessage(message, groupId, config.username, config.password);
    }
  } catch (e) {}
}

function sendToProjectTelegramGroup(projectName, message) {
  try {
    const telegramConfig = getTelegramConfig();
    const groupId = getProjectTelegramGroup(projectName);
    if (telegramConfig.botToken && groupId) {
      sendTelegramMessage(groupId, message, telegramConfig.botToken);
    }
  } catch (e) {}
}

function getTelegramConfig() {
  const settingsArray = sheetToJSON('AppSettings');
  const settings = settingsArray[0] || {};
  return {
    botToken: settings.officeTokenId || "",
    chatId: settings.officeTelegramGroupId || ""
  };
}

function sendTelegramMessage(chatId, text, botToken) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown'
  };
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  };
  UrlFetchApp.fetch(url, options);
}

function getMASConfig() {
  const settingsArray = sheetToJSON('AppSettings');
  const settings = settingsArray[0] || {};
  return {
    username: settings.masId || "",
    password: settings.masPassword || "",
    defaultGroup: settings.whatsappGroupId || ""
  };
}

function getUserMobile(userName) {
  if (!userName) return null;
  try {
    const users = sheetToJSON('Users');
    const user = users.find(u => u.name && u.name.trim().toLowerCase() === userName.trim().toLowerCase());
    return user ? user.mobile : null;
  } catch (e) {
    return null;
  }
}

function sendpersonalMessage(waMessage, mobileNumber, username, password) {
  var url = "https://app.messageautosender.com/api/v1/message/create";
  var payload = {
    "receiverMobileNo": mobileNumber,
    "message": [waMessage.toString()]
  };
  var options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'headers': {
      'accept': 'application/json',
      'Authorization': 'Basic ' + Utilities.base64Encode(username + ":" + password)
    }
  };
  try {
    UrlFetchApp.fetch(url, options);
  } catch (e) {
    Logger.log(e);
  }
}

function sendgroupMessage(waMessage, groupId, username, password) {
  var url = "https://app.messageautosender.com/api/v1/message/create-group-message";
  var payload = {
    "groupInviteCode": groupId,
    "message": [waMessage.toString()]
  };
  var options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'headers': {
      'accept': 'application/json',
      'Authorization': 'Basic ' + Utilities.base64Encode(username + ":" + password)
    }
  };
  try {
    UrlFetchApp.fetch(url, options);
  } catch (e) {
    Logger.log(e);
  }
}

function handleRecurringTaskNotification(data, isNew) {
  // Logic for recurring task notifications if needed
}