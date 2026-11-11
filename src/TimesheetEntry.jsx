  const handleExport = async (actionType) => {
    setExportingAction(actionType);
    try {
      const response = await fetch('/Blank Time Cards.docx');
      if (!response.ok) {
        throw new Error("Template file 'Blank Time Cards.docx' not found in public root.");
      }
      const templateArrayBuffer = await response.arrayBuffer();

      const startDateStr = weekDays[0].dateStr;
      const endDateStr = weekDays[6].dateStr;
      let weeklyEntries = [];

      if (userId) {
        const q = query(
          collection(db, 'timesheets'),
          where('userId', '==', userId),
          where('date', '>=', startDateStr),
          where('date', '<=', endDateStr)
        );
        let querySnapshot;
        try {
          querySnapshot = await getDocs(q);
        } catch {
          querySnapshot = await getDocsFromCache(q);
        }
        querySnapshot.forEach((docSnap) => {
          weeklyEntries.push(docSnap.data());
        });
      }

      if (weeklyEntries.length === 0) {
        alert("No submitted entries found for this week to export.");
        setStatusMessage({ type: 'error', text: "No submitted entries found for this week to export." });
        setTimeout(() => setStatusMessage(null), 4000);
        setExportingAction(null);
        return;
      }

      const siteMap = {};
      weeklyEntries.forEach((entry) => {
        const siteName = entry.project || "General / Unassigned";
        if (!siteMap[siteName]) {
          siteMap[siteName] = [];
        }
        siteMap[siteName].push(entry);
      });

      const sitesToExport = Object.keys(siteMap);
      const nativeFileUris = [];
      const generatedWebFiles = [];

      const isIOSWeb = !Capacitor.isNativePlatform() && isIPhoneUser();
      const zipArchive = (isIOSWeb && actionType === 'download') ? new JSZip() : null;

      function setCellText(cell, text, xmlDoc) {
        const ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
        const tNodes = cell.getElementsByTagNameNS(ns, "t");
        if (tNodes.length > 0) {
          tNodes[0].textContent = text;
          tNodes[0].setAttribute("xml:space", "preserve");
          for (let i = 1; i < tNodes.length; i++) {
            tNodes[i].textContent = "";
          }
        } else {
          let pNodes = cell.getElementsByTagNameNS(ns, "w:p");
          let p = pNodes[0];
          if (!p) {
            p = xmlDoc.createElementNS(ns, "w:p");
            cell.appendChild(p);
          }
          const r = xmlDoc.createElementNS(ns, "w:r");
          const t = xmlDoc.createElementNS(ns, "w:t");
          t.textContent = text;
          t.setAttribute("xml:space", "preserve");
          r.appendChild(t);
          p.appendChild(r);
        }
      }

      function fillTimingRow(cells, timingKey, siteEntriesForExport, days, xmlDoc) {
        days.forEach((dayObj, idx) => {
          if (!cells[idx + 1]) return;
          const entriesForDay = siteEntriesForExport.filter(e => e.date === dayObj.dateStr);
          const val = entriesForDay.map(e => e.timeCardDetails?.[timingKey]).filter(Boolean).join(" / ") || "";
          setCellText(cells[idx + 1], val, xmlDoc);
        });
      }

      function fillTaskRow(cells, taskLabel, siteEntriesForExport, days, xmlDoc) {
        let rowTaskTotal = 0;
        days.forEach((dayObj, idx) => {
          if (!cells[idx + 1]) return;
          const entriesForDay = siteEntriesForExport.filter(e => e.date === dayObj.dateStr);
          let dayTaskHours = 0;

          if (entriesForDay.length > 0 && taskLabel !== "") {
            entriesForDay.forEach(entryForDay => {
              if (entryForDay.tasks) {
                entryForDay.tasks.forEach(t => {
                  const tName = (t.taskName || '').toLowerCase().trim();
                  const lName = taskLabel.toLowerCase().trim();
                  const nameMatches =
                    tName === lName ||
                    (lName.includes("pto") && (tName.includes("other work") || tName.includes("pto"))) ||
                    (lName.includes("specify") && tName.includes("other leave")) ||
                    (lName.length > 4 && tName.length > 4 && lName.startsWith(tName));

                  if (nameMatches) {
                    dayTaskHours += parseFloat(t.hours) || 0;
                  }
                });
              }
            });
          }
          rowTaskTotal += dayTaskHours;
          setCellText(cells[idx + 1], dayTaskHours > 0 ? String(safeRound(dayTaskHours)) : "", xmlDoc);
        });
        if (cells[8]) {
          setCellText(cells[8], rowTaskTotal > 0 ? String(safeRound(rowTaskTotal)) : "", xmlDoc);
        }
      }

      function fillTotalHoursRow(cells, siteEntriesForExport, days, xmlDoc) {
        let siteGrandTotalHours = 0;
        days.forEach((dayObj, idx) => {
          if (!cells[idx + 1]) return;
          const entriesForDay = siteEntriesForExport.filter(e => e.date === dayObj.dateStr);
          let dayTotal = 0;
          entriesForDay.forEach(entryForDay => {
            if (entryForDay.tasks) {
              dayTotal += entryForDay.tasks.reduce((sum, t) => sum + (parseFloat(t.hours) || 0), 0);
            }
          });
          siteGrandTotalHours += dayTotal;
          setCellText(cells[idx + 1], dayTotal > 0 ? String(safeRound(dayTotal)) : "", xmlDoc);
        });
        if (cells[8]) {
          setCellText(cells[8], siteGrandTotalHours > 0 ? String(safeRound(siteGrandTotalHours)) : "", xmlDoc);
        }
      }

      function fillTravelRow(cells, siteEntriesForExport, days, xmlDoc) {
        let siteGrandTravelTotal = 0;
        days.forEach((dayObj, idx) => {
          if (!cells[idx + 1]) return;
          const entriesForDay = siteEntriesForExport.filter(e => e.date === dayObj.dateStr);
          let dayTravel = 0;
          entriesForDay.forEach(entryForDay => {
            if (entryForDay.tasks) {
              dayTravel += entryForDay.tasks.reduce((sum, t) => sum + (parseFloat(t.travelTime) || 0), 0);
            }
          });
          siteGrandTravelTotal += dayTravel;
          setCellText(cells[idx + 1], dayTravel > 0 ? String(safeRound(dayTravel)) : "", xmlDoc);
        });
        if (cells[8]) {
          setCellText(cells[8], siteGrandTravelTotal > 0 ? String(safeRound(siteGrandTravelTotal)) : "", xmlDoc);
        }
      }

      const cleanText = (str) => (str || '').replace(/\s+/g, ' ').trim();

      const weekStartStr = weekDays[0].dateStr;
      const [year, month, day] = weekStartStr.split('-');
      const formattedDateStr = `${day}-${month}-${year.slice(-2)}`;

      let siteIndexCounter = 0;

      for (const siteName of sitesToExport) {
        const siteEntriesForExport = siteMap[siteName];
        const zip = new PZip(templateArrayBuffer);
        const docXmlStr = zip.file("word/document.xml").asText();
        
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(docXmlStr, "text/xml");
        const rows = xmlDoc.getElementsByTagName("w:tr");
        const paragraphs = xmlDoc.getElementsByTagName("w:p");

        for (let p of paragraphs) {
          const tNodes = p.getElementsByTagName("w:t");
          if (tNodes.length === 0) continue;

          let fullText = "";
          for (let i = 0; i < tNodes.length; i++) {
            fullText += tNodes[i].textContent;
          }

          if (fullText.includes("Staff Member") || fullText.includes("Project")) {
            if (fullText.includes("Staff Member") && fullText.includes("Project")) {
              tNodes[0].textContent = `Staff Member: ${userName}      Project: ${siteName}`;
              for (let i = 1; i < tNodes.length; i++) {
                tNodes[i].textContent = "";
              }
            } else if (fullText.includes("Staff Member")) {
              tNodes[0].textContent = fullText.replace(/Staff Member:\s*([^\r\n]*)?/g, `Staff Member: ${userName}`);
              for (let i = 1; i < tNodes.length; i++) {
                tNodes[i].textContent = "";
              }
            } else if (fullText.includes("Project")) {
              tNodes[0].textContent = fullText.replace(/Project:\s*([^\r\n]*)?/g, `Project: ${siteName}`);
              for (let i = 1; i < tNodes.length; i++) {
                tNodes[i].textContent = "";
              }
            }
          }
        }

        let collectedComments = [];
        siteEntriesForExport.forEach(entry => {
          if (entry.tasks) {
            entry.tasks.forEach(t => {
              const tName = (t.taskName || '').toLowerCase();
              const tGroup = (t.categoryGroup || '').toLowerCase();
              
              const isOtherWork = tName.includes("other work") || tGroup.includes("other work");
              const isOtherLeave = tName.includes("other leave") || tGroup.includes("leave");

              if ((isOtherWork || isOtherLeave) && t.comments && t.comments.trim() !== '') {
                const label = isOtherLeave ? "Other Leave" : "Other Work";
                collectedComments.push(`${displayDate(entry.date)} [${label}]: ${t.comments.trim()}`);
              }
            });
          }
        });

        if (collectedComments.length > 0) {
          let foundCommentBlock = false;
          for (let p of paragraphs) {
            let fullPText = "";
            const tNodes = p.getElementsByTagName("w:t");
            for (let tn of tNodes) fullPText += tn.textContent;

            if (fullPText.includes("If Other") || fullPText.includes("detail what type of work")) {
              if (tNodes.length > 0) {
                tNodes[0].textContent = "If Other - please detail what type of work you were undertaking:";
                tNodes[0].setAttribute("xml:space", "preserve");
                
                for (let i = 1; i < tNodes.length; i++) {
                  tNodes[i].textContent = "";
                }

                const ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
                
                collectedComments.forEach((commentTextStr) => {
                  const newP = xmlDoc.createElementNS(ns, "w:p");
                  const newRun = xmlDoc.createElementNS(ns, "w:r");
                  const newT = xmlDoc.createElementNS(ns, "w:t");
                  newT.textContent = `• ${commentTextStr}`;
                  newT.setAttribute("xml:space", "preserve");
                  
                  newRun.appendChild(newT);
                  newP.appendChild(newRun);

                  p.parentNode.insertBefore(newP, p.nextSibling);
                });

                foundCommentBlock = true;
                break;
              }
            }
          }

          if (!foundCommentBlock) {
            for (let tr of rows) {
              const cells = tr.getElementsByTagName("w:tc");
              for (let cell of cells) {
                let fullCellText = "";
                const tNodes = cell.getElementsByTagName("w:t");
                for (let tn of tNodes) fullCellText += tn.textContent;

                if (fullCellText.includes("If Other") || fullCellText.includes("detail what type of work")) {
                  if (tNodes.length > 0) {
                    tNodes[0].textContent = "If Other - please detail what type of work you were undertaking:";
                    tNodes[0].setAttribute("xml:space", "preserve");
                    
                    for (let i = 1; i < tNodes.length; i++) {
                      tNodes[i].textContent = "";
                    }

                    const ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
                    
                    collectedComments.forEach((commentTextStr) => {
                      const newP = xmlDoc.createElementNS(ns, "w:p");
                      const newRun = xmlDoc.createElementNS(ns, "w:r");
                      const newT = xmlDoc.createElementNS(ns, "w:t");
                      newT.textContent = `• ${commentTextStr}`;
                      newT.setAttribute("xml:space", "preserve");
                      
                      newRun.appendChild(newT);
                      newP.appendChild(newRun);

                      cell.appendChild(newP);
                    });

                    foundCommentBlock = true;
                    break;
                  }
                }
              }
              if (foundCommentBlock) break;
            }
          }
        }

        function getCellText(cell) {
          const tNodes = cell.getElementsByTagName("w:t");
          let str = "";
          for (let tn of tNodes) str += tn.textContent;
          return str;
        }

        for (let tr of rows) {
          const cells = tr.getElementsByTagName("w:tc");
          if (cells.length === 0) continue;
          
          const firstCellText = getCellText(cells[0]).trim();
          
          if (firstCellText === "Date") {
            weekDays.forEach((dayObj, idx) => {
              if (cells[idx + 1]) {
                const dateParts = dayObj.dateStr.split('-');
                const displayDDMM = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}` : dayObj.dateStr;
                setCellText(cells[idx + 1], displayDDMM, xmlDoc);
              }
            });
          } else if (firstCellText === "START TIME") {
            fillTimingRow(cells, "startTime", siteEntriesForExport, weekDays, xmlDoc);
          } else if (firstCellText === "TIME LEFT SITE") {
            fillTimingRow(cells, "timeLeftSite", siteEntriesForExport, weekDays, xmlDoc);
          } else if (firstCellText === "TIME RETURNED") {
            fillTimingRow(cells, "timeReturned", siteEntriesForExport, weekDays, xmlDoc);
          } else if (firstCellText === "TIME FINISHED") {
            fillTimingRow(cells, "timeFinished", siteEntriesForExport, weekDays, xmlDoc);
          } else if (firstCellText === "TOTAL HOURS") {
            fillTotalHoursRow(cells, siteEntriesForExport, weekDays, xmlDoc);
          } else if (firstCellText === "Travel Time") {
            fillTravelRow(cells, siteEntriesForExport, weekDays, xmlDoc);
          } else {
            const matchedTask = ALL_TEMPLATE_TASKS.find(task => cleanText(task) === cleanText(firstCellText));
            if (matchedTask) {
              fillTaskRow(cells, matchedTask, siteEntriesForExport, weekDays, xmlDoc);
            }
          }
        }

        const serializer = new XMLSerializer();
        const updatedXmlStr = serializer.serializeToString(xmlDoc);
        zip.file("word/document.xml", updatedXmlStr);

        const fileSuffix = siteIndexCounter > 0 ? ` (${siteIndexCounter})` : '';
        const fileName = `Time Cards ${formattedDateStr}${fileSuffix}.docx`;
        siteIndexCounter++;

        const blobMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

        // --- NATIVE APP HANDLING (Capacitor) ---
        if (Capacitor.isNativePlatform()) {
          const content = zip.generate({ type: 'uint8array' });
          let binary = '';
          const bytes = new Uint8Array(content);
          const len = bytes.byteLength;
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64Data = window.btoa(binary);

          if (actionType === 'share') {
            const writtenFile = await Filesystem.writeFile({
              path: fileName,
              data: base64Data,
              directory: Directory.Cache,
              recursive: true
            });
            const uriResult = await Filesystem.getUri({
              path: fileName,
              directory: Directory.Cache,
            });
            const finalUri = uriResult?.uri || writtenFile?.uri;
            if (finalUri) {
              nativeFileUris.push(finalUri);
            }
          } else {
            // Save directly to device Downloads directory
            await Filesystem.writeFile({
              path: fileName,
              data: base64Data,
              directory: Directory.Downloads,
              recursive: true
            });
          }
        } else {
          // --- WEB BROWSER HANDLING (Vercel) ---
          const blob = zip.generate({
            type: 'blob',
            mimeType: blobMime,
          });

          if (isIOSWeb && actionType === 'download') {
            zipArchive.file(fileName, blob);
          } else {
            const fileObj = new File([blob], fileName, { type: blobMime });
            generatedWebFiles.push({ fileObj, blob, fileName });
          }
        }
      }

      if (Capacitor.isNativePlatform()) {
        if (actionType === 'share' && nativeFileUris.length > 0) {
          try {
            await Share.share({
              files: nativeFileUris,
              dialogTitle: 'Share Time Cards',
            });
            setStatusMessage({ type: 'success', text: `Shared ${sitesToExport.length} site time card(s)!` });
          } catch (shareErr) {
            if (!shareErr?.message?.includes('canceled') && !shareErr?.message?.includes('cancelled')) {
              console.warn("Share warning:", shareErr);
            }
          }
        } else if (actionType === 'download') {
          setStatusMessage({ type: 'success', text: `Downloaded ${sitesToExport.length} time card(s) to Downloads folder!` });
        }
      } else if (isIOSWeb && actionType === 'download') {
        const masterZipBlob = await zipArchive.generateAsync({ type: 'blob' });
        const masterZipName = `Time_Cards_${formattedDateStr}.zip`;
        
        const url = URL.createObjectURL(masterZipBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = masterZipName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setStatusMessage({ type: 'success', text: `Downloaded ${sitesToExport.length} site time card(s) as .zip!` });
      } else if (actionType === 'share') {
        let didShare = false;
        if (navigator.share && navigator.canShare && generatedWebFiles.length > 0) {
          try {
            const filesToShare = generatedWebFiles.map(f => f.fileObj);
            if (navigator.canShare({ files: filesToShare })) {
              await navigator.share({
                title: 'SJR Builders Time Cards',
                text: `Weekly Time Cards for ${userName}`,
                files: filesToShare
              });
              didShare = true;
            }
          } catch (shareErr) {
            if (shareErr.name === 'AbortError') {
              didShare = true;
            } else {
              console.warn("Web share warning:", shareErr);
            }
          }
        }
        
        if (!didShare) {
          generatedWebFiles.forEach(({ blob, fileName }) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          });
          setStatusMessage({ type: 'success', text: `Downloaded ${sitesToExport.length} site time card(s) (Share fallback)!` });
        } else {
          setStatusMessage({ type: 'success', text: `Share action completed.` });
        }
      } else {
        generatedWebFiles.forEach(({ blob, fileName }) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        });
        setStatusMessage({ type: 'success', text: `Downloaded ${sitesToExport.length} site time card(s)!` });
      }

      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error("DOCX export error:", err);
      alert(`Export Failed: ${err?.message || JSON.stringify(err)}`);
      setStatusMessage({ type: 'error', text: `Export failed: ${err?.message || "Error generating document"}` });
    } finally {
      setExportingAction(null);
    }
  };
