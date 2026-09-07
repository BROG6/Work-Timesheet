// Exact template tasks matching "Blank Time Cards_2.docx" layout
const ALL_TEMPLATE_TASKS = [
  "Demolition",
  "Profile/Set Up",
  "Excavate/Footings",
  "Boxing",
  "Reinforcing",
  "Polythene/Polystyrene",
  "Concrete/Blockfill",
  "Timber Floor Structure & Flooring",
  "Structural Steel",
  "Structural Connections",
  "Wall Framing",
  "Roof Framing and Purlins",
  "Fascia and Soffits",
  "C/Battens, Rab/Ecoply",
  "Building Paper/Aliband",
  "Exterior Windows/Doors",
  "Exterior Cladding",
  "Insulation",
  "Ceiling Battens",
  "Ceiling Linings",
  "Interior Doors",
  "Wall Linings",
  "Scotia/Skirting/Architrave",
  "Hardware/ Door Hardware",
  "Shelving/Joinery",
  "Deck Framing & Decking",
  "Driveway/Paths/Landscaping",
  "Other (PTO)",
  "Sick Leave",
  "Annual Leave",
  "Bereavement Leave",
  "Training",
  "Other Leave (please specify)",
  "" // Blank row before TOTAL HOURS matching template structure
];

const handleExportDocx = async () => {
  setExportingDocx(true);
  try {
    const tableBorderColor = "000000"; // Sharp, clean template borders

    const thinBorder = {
      top: { style: BorderStyle.SINGLE, size: 1, color: tableBorderColor },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: tableBorderColor },
      left: { style: BorderStyle.SINGLE, size: 1, color: tableBorderColor },
      right: { style: BorderStyle.SINGLE, size: 1, color: tableBorderColor },
    };

    const createCell = ({
      text = "",
      bold = false,
      align = AlignmentType.LEFT,
      widthPct = null,
      colSpan = 1,
      shading = null,
      fontSize = 18 // 9pt font matching compact DOCX template sizing
    }) => {
      return new TableCell({
        columnSpan: colSpan,
        width: widthPct ? { size: widthPct, type: WidthType.PERCENTAGE } : undefined,
        shading: shading ? { fill: shading, type: ShadingType.CLEAR } : undefined,
        borders: thinBorder,
        margins: { top: 20, bottom: 20, left: 40, right: 40 },
        children: [
          new Paragraph({
            alignment: align,
            children: [new TextRun({ text: String(text || ""), bold, size: fontSize, font: "Arial" })]
          })
        ]
      });
    };

    const daysHeader = ["Wed", "Thu", "Fri", "Sat", "Sun", "Mon", "Tue"];
    const validWeekDates = weekDays.map((d) => d.dateStr);

    let weeklyEntries = [];
    if (userId) {
      const q = query(collection(db, 'timesheets'), where('userId', '==', userId));
      let querySnapshot;
      try {
        querySnapshot = await getDocs(q);
      } catch {
        querySnapshot = await getDocsFromCache(q);
      }

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (validWeekDates.includes(data.date)) {
          weeklyEntries.push(data);
        }
      });
    }

    const activeHasSaved = weeklyEntries.some(e => e.date === selectedDate);
    if (!activeHasSaved && totalHours > 0) {
      weeklyEntries.push({
        project: project || "General / Unassigned",
        date: selectedDate,
        timeCardDetails: { startTime, timeFinished, timeLeftSite, timeReturned },
        tasks: tasks.map(t => ({
          taskName: t.taskName,
          hours: parseFloat(t.hours) || 0,
          travelTime: parseFloat(t.travelTime) || 0,
          comments: t.comments
        }))
      });
    }

    const siteMap = {};
    weeklyEntries.forEach((entry) => {
      const siteName = entry.project || project || "General / Unassigned";
      if (!siteMap[siteName]) {
        siteMap[siteName] = [];
      }
      siteMap[siteName].push(entry);
    });

    const sitesToExport = Object.keys(siteMap);
    if (sitesToExport.length === 0) {
      sitesToExport.push(project || "General / Unassigned");
      siteMap[project || "General / Unassigned"] = [{
        project: project || "General / Unassigned",
        date: selectedDate,
        timeCardDetails: { startTime, timeFinished, timeLeftSite, timeReturned },
        tasks
      }];
    }

    for (const siteName of sitesToExport) {
      const siteEntries = siteMap[siteName];
      const tableRows = [];

      // Row 1: Header (Day | Wed | Thu | Fri | Sat | Sun | Mon | Tue | Totals)
      tableRows.push(
        new TableRow({
          children: [
            createCell({ text: "Day", bold: true, widthPct: 40 }),
            ...daysHeader.map((day) =>
              createCell({ text: day, bold: true, align: AlignmentType.CENTER, widthPct: 7.5 })
            ),
            createCell({ text: "Totals", bold: true, align: AlignmentType.RIGHT, widthPct: 8 })
          ]
        })
      );

      // Row 2: Date Row
      tableRows.push(
        new TableRow({
          children: [
            createCell({ text: "Date", bold: true }),
            ...weekDays.map((d) => createCell({ text: `${d.dayNumber}/${d.dateStr.split('-')[1] || ''}`, align: AlignmentType.CENTER })),
            createCell({ text: "", align: AlignmentType.CENTER })
          ]
        })
      );

      // Timing Breakdown Rows
      const timingFields = [
        { label: "START TIME", key: "startTime" },
        { label: "TIME LEFT SITE", key: "timeLeftSite" },
        { label: "TIME RETURNED", key: "timeReturned" },
        { label: "TIME FINISHED", key: "timeFinished" }
      ];

      timingFields.forEach((tf) => {
        const cells = [createCell({ text: tf.label, bold: true })];
        weekDays.forEach((dayObj) => {
          const entryForDay = siteEntries.find((e) => e.date === dayObj.dateStr);
          const val = entryForDay?.timeCardDetails?.[tf.key] || "";
          cells.push(createCell({ text: val, align: AlignmentType.CENTER }));
        });
        cells.push(createCell({ text: "" }));
        tableRows.push(new TableRow({ children: cells }));
      });

      // 34 Standard Template Rows
      let siteGrandTotalHours = 0;
      let siteGrandTravelTotal = 0;

      ALL_TEMPLATE_TASKS.forEach((taskLabel) => {
        let rowTaskTotal = 0;
        const rowCells = [createCell({ text: taskLabel })];

        weekDays.forEach((dayObj) => {
          const entryForDay = siteEntries.find((e) => e.date === dayObj.dateStr);
          let dayTaskHours = 0;

          if (entryForDay?.tasks && taskLabel !== "") {
            entryForDay.tasks.forEach((t) => {
              const nameMatches = (t.taskName || '').toLowerCase().trim() === taskLabel.toLowerCase().trim() ||
                (taskLabel.startsWith("Other (PTO)") && (t.taskName || '').toLowerCase().includes("other work")) ||
                (taskLabel.startsWith("Other Leave") && (t.taskName || '').toLowerCase().includes("other leave"));
              
              if (nameMatches) {
                dayTaskHours += parseFloat(t.hours) || 0;
              }
            });
          }

          rowTaskTotal += dayTaskHours;
          rowCells.push(createCell({
            text: dayTaskHours > 0 ? String(dayTaskHours) : "",
            align: AlignmentType.CENTER
          }));
        });

        siteGrandTotalHours += rowTaskTotal;
        rowCells.push(createCell({
          text: rowTaskTotal > 0 ? String(rowTaskTotal) : "",
          bold: true,
          align: AlignmentType.RIGHT
        }));

        tableRows.push(new TableRow({ children: rowCells }));
      });

      // TOTAL HOURS Row
      const totalHoursCells = [createCell({ text: "TOTAL HOURS", bold: true })];
      weekDays.forEach((dayObj) => {
        const entryForDay = siteEntries.find((e) => e.date === dayObj.dateStr);
        let dayTotal = 0;
        if (entryForDay?.tasks) {
          dayTotal = entryForDay.tasks.reduce((sum, t) => sum + (parseFloat(t.hours) || 0), 0);
        }
        totalHoursCells.push(createCell({
          text: dayTotal > 0 ? String(dayTotal) : "",
          bold: true,
          align: AlignmentType.CENTER
        }));
      });
      totalHoursCells.push(createCell({ text: String(siteGrandTotalHours), bold: true, align: AlignmentType.RIGHT }));
      tableRows.push(new TableRow({ children: totalHoursCells }));

      // Travel Time Row
      const travelCells = [createCell({ text: "Travel Time", bold: true })];
      weekDays.forEach((dayObj) => {
        const entryForDay = siteEntries.find((e) => e.date === dayObj.dateStr);
        let dayTravel = 0;
        if (entryForDay?.tasks) {
          dayTravel = entryForDay.tasks.reduce((sum, t) => sum + (parseFloat(t.travelTime) || 0), 0);
        }
        siteGrandTravelTotal += dayTravel;
        travelCells.push(createCell({ text: dayTravel > 0 ? String(dayTravel) : "", align: AlignmentType.CENTER }));
      });
      travelCells.push(createCell({ text: siteGrandTravelTotal > 0 ? String(siteGrandTravelTotal) : "", align: AlignmentType.RIGHT }));
      tableRows.push(new TableRow({ children: travelCells }));

      // Comments Section Matching Template Exactly
      const allComments = [];
      siteEntries.forEach((entry) => {
        if (entry.tasks) {
          entry.tasks.forEach((t) => {
            if (t.comments && t.comments.trim()) {
              allComments.push(`${displayDate(entry.date)}: ${t.comments.trim()}`);
            }
          });
        }
      });

      tableRows.push(
        new TableRow({
          children: [createCell({ text: "COMMENTS", bold: true, colSpan: 9 })]
        })
      );

      tableRows.push(
        new TableRow({
          children: [createCell({ text: "If Other – please detail what type of work you were undertaking", colSpan: 9, fontSize: 16 })]
        })
      );

      // Comments text entry row
      tableRows.push(
        new TableRow({
          children: [createCell({ text: allComments.length > 0 ? allComments.join(" | ") : "", colSpan: 9 })]
        })
      );

      // Compile Document
      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: { top: 500, bottom: 500, left: 500, right: 500 } // Narrow margins to fit all rows on one page
              }
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "Staff Member: ", bold: true, size: 20, font: "Arial" }),
                  new TextRun({ text: `${userName}\t\t\t\t\t\t\t\t`, size: 20, font: "Arial" }),
                  new TextRun({ text: "Project: ", bold: true, size: 20, font: "Arial" }),
                  new TextRun({ text: siteName, size: 20, font: "Arial" })
                ],
                spaceAfter: 120
              }),

              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: tableRows
              })
            ]
          }
        ]
      });

      const safeUserName = userName.replace(/[^a-zA-Z0-9_\-]/g, '_');
      const safeSiteName = siteName.replace(/[^a-zA-Z0-9_\-]/g, '_');
      const weekStartStr = weekDays[0].dateStr;

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `TimeCard_${safeUserName}_${safeSiteName}_${weekStartStr}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    setStatusMessage({
      type: 'success',
      text: `Exported ${sitesToExport.length} site time card(s) matching exact template!`
    });
    setTimeout(() => setStatusMessage(null), 4000);
  } catch (err) {
    console.error("DOCX export error:", err);
    setStatusMessage({
      type: 'error',
      text: "Failed to generate DOCX file."
    });
  } finally {
    setExportingDocx(false);
  }
};
