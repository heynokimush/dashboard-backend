import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.get("/read", (req, res) => {
  try {
    const id = req.query.id;

    if (!id) {
      return res.status(400).json({ message: "id 값이 필요합니다." });
    }

    const filePath = path.join(__dirname, "dashboards", `dashboard${id}.json`);

    if (!fs.existsSync(filePath)) {
      return res
        .status(404)
        .json({ message: "해당 ID의 JSON 파일을 찾을 수 없습니다." });
    }

    const jsonData = fs.readFileSync(filePath, "utf-8");
    return res.status(200).json(JSON.parse(jsonData));
  } catch (error) {
    console.error("파일 읽기 오류:", error);
    return res.status(500).json({ message: "파일을 읽는 중 오류 발생" });
  }
});

router.get("/list", (req, res) => {
  try {
    const status = req.query.status;
    const dirPath = path.join(__dirname, "dashboards");

    if (!fs.existsSync(dirPath)) {
      return res.status(200).json({ dashboards: [] });
    }

    const files = fs
      .readdirSync(dirPath)
      .filter((file) => file.endsWith(".json"));

    const dashboards = files
      .map((file) => {
        const filePath = path.join(dirPath, file);
        try {
          const jsonData = JSON.parse(fs.readFileSync(filePath, "utf8"));
          return {
            id: jsonData.id || "",
            dashboardName: jsonData.dashboardInfo?.dashboardName || "",
            createdAt: jsonData.createdAt || "",
            updatedAt: jsonData.updatedAt || "-",
            status: jsonData.status || "",
          };
        } catch (error) {
          console.error(`파일 읽기 오류 (${file}):`, error);
          return null;
        }
      })
      .filter(
        (dashboard) =>
          dashboard !== null && (status ? dashboard.status === status : true)
      );

    res.status(200).json({ dashboards });
  } catch (error) {
    console.error("파일 목록 조회 오류:", error);
    res.status(500).json({ message: "파일 목록을 가져오는 중 오류 발생" });
  }
});

router.post("/create", (req, res) => {
  const data = req.body;
  const dirPath = path.join(process.cwd(), "dashboards");

  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const files = fs
      .readdirSync(dirPath)
      .filter((file) => file.endsWith(".json"));

    const existingNames = files.map((file) => {
      const fileData = JSON.parse(
        fs.readFileSync(path.join(dirPath, file), "utf-8")
      );
      return fileData.dashboardInfo?.dashboardName;
    });

    if (existingNames.includes(data.dashboardInfo.dashboardName)) {
      return res
        .status(400)
        .json({ message: "이미 존재하는 대시보드 이름입니다." });
    }

    const maxId = files
      .map((file) => parseInt(file.match(/\d+/)?.[0] || "0", 10))
      .reduce((max, num) => (num > max ? num : max), 0);

    const newId = maxId + 1;
    data.id = newId;

    const now = new Date();
    const formattedDate = now
      .toLocaleString("ko-KR", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      })
      .replace(/\. /g, "-")
      .replace(/\./g, "")
      .replace(/-(\d{2}):/, " $1:");

    data.createdAt = formattedDate;
    data.status = "CREATED";

    const filePath = path.join(dirPath, `dashboard${newId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");

    res.status(200).json({ id: newId });
  } catch (error) {
    console.error("파일 저장 오류:", error);
    res.status(500).json({ message: "파일 저장 중 오류 발생" });
  }
});

router.patch("/update", (req, res) => {
  try {
    const { id } = req.query;
    const { detailInfo: newDetailInfo } = req.body;

    if (!id || !newDetailInfo) {
      return res
        .status(400)
        .json({ message: "필수 정보값이 입력되지 않았습니다." });
    }

    const isEmptyObject = (obj) =>
      Object.values(obj).every((value) => value === "");

    const hasMissingFields = (obj) =>
      Object.values(obj).some((value) => value === "") && !isEmptyObject(obj);

    const keyNameMap = {
      groupData: "그룹항목",
      aggregatedData: "집계항목",
    };

    for (const key of ["groupData", "aggregatedData"]) {
      if (Array.isArray(newDetailInfo[key])) {
        const filtered = newDetailInfo[key].filter(
          (item) => !isEmptyObject(item)
        );

        const hasError = filtered.some((item) => hasMissingFields(item));
        if (hasError) {
          return res.status(400).json({
            message: `${keyNameMap[key]}에 필수 정보값이 누락되었습니다.`,
          });
        }

        newDetailInfo[key] = filtered.map((item, index) => ({
          ...item,
          id: index + 1,
        }));
      }
    }

    const filePath = path.join(__dirname, "dashboards", `dashboard${id}.json`);
    if (!fs.existsSync(filePath)) {
      return res
        .status(404)
        .json({ message: "해당 ID의 JSON 파일이 없습니다." });
    }

    const jsonData = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    const formatDate = () =>
      new Date()
        .toLocaleString("ko-KR", {
          timeZone: "Asia/Seoul",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hourCycle: "h23",
        })
        .replace(/\. /g, "-")
        .replace(/\./g, "")
        .replace(/-(\d{2}):/, " $1:");

    jsonData.detailInfo = newDetailInfo;
    jsonData.updatedAt = formatDate();

    const groupData = jsonData.detailInfo.groupData;
    const aggregatedData = jsonData.detailInfo.aggregatedData;

    const hasValidGroupData =
      typeof groupData === "object" &&
      Array.isArray(groupData) &&
      groupData.length > 0 &&
      Object.keys(groupData[0]).length > 0;

    const hasValidAggregatedData =
      aggregatedData.length > 0 && Object.keys(aggregatedData[0]).length > 0;

    jsonData.status =
      hasValidGroupData && hasValidAggregatedData ? "COMPLETED" : "CREATED";

    fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2), "utf-8");

    return res.sendStatus(200);
  } catch (error) {
    console.error("파일 수정 오류:", error);
    return res.status(500).json({ message: "파일 수정 중 오류 발생" });
  }
});

router.delete("/delete", (req, res) => {
  try {
    const id = req.query.id;

    if (!id) {
      return res.status(400).json({ message: "id 값이 필요합니다." });
    }

    const filePath = path.join(__dirname, "dashboards", `dashboard${id}.json`);

    if (!fs.existsSync(filePath)) {
      return res
        .status(404)
        .json({ message: "해당 ID의 JSON 파일을 찾을 수 없습니다." });
    }

    fs.unlinkSync(filePath);

    return res.sendStatus(200);
  } catch (error) {
    console.error("파일 삭제 오류:", error);
    return res.status(500).json({ message: "파일 삭제 중 오류 발생" });
  }
});

export default router;
