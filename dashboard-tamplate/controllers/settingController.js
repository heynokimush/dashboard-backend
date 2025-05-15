import client from "../db/mongoClient.js";
import { ObjectId } from "mongodb";

const settingDbName = "setting";
const settingCollectionName = "dashboardInfo";

const statisticsDbName = "statistics";
const statisticsCollectionName = "statisticsData";

const formattedDate = (now) => {
  return now
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
};

export const createDashboard = async (req, res) => {
  try {
    const dashboardInfo = req.body.dashboardInfo;

    if (
      !dashboardInfo ||
      !dashboardInfo.dashboardName ||
      !dashboardInfo.esdName
    ) {
      return res
        .status(400)
        .json({ message: "대시보드 이름 및 ESD 이름은 필수입니다." });
    }

    await client.connect();
    const settingDb = client.db(settingDbName);
    const settingCollection = settingDb.collection(settingCollectionName);

    const statisticsDb = client.db(statisticsDbName);
    const statisticsCollection = statisticsDb.collection(
      statisticsCollectionName
    );

    const existingDashboard = await settingCollection.findOne({
      "dashboardData.dashboardInfo.dashboardName": dashboardInfo.dashboardName,
    });

    if (existingDashboard) {
      return res
        .status(400)
        .json({ message: "이미 존재하는 대시보드 이름입니다." });
    }

    const existingEsd = await statisticsCollection.findOne({
      esdName: dashboardInfo.esdName,
    });

    if (!existingEsd) {
      return res
        .status(400)
        .json({ message: "해당 이름을 가진 ESD가 존재하지 않습니다." });
    }

    const newDashboard = {
      dashboardInfo,
      createdAt: formattedDate(new Date()),
      status: "CREATED",
    };

    const result = await settingCollection.insertOne(newDashboard);

    res.status(200).json({ id: result.insertedId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "대시보드 생성 실패" });
  }
};

export const getDashboardList = async (req, res) => {
  try {
    const status = req.query.status;

    await client.connect();
    const settingDb = client.db(settingDbName);
    const settingCollection = settingDb.collection(settingCollectionName);

    const dashboards = await settingCollection
      .find({ status: { $ne: "DELETED" } && { status } })
      .toArray();

    res.status(200).json(dashboards);
  } catch (error) {
    console.error("Get Dashboard List Error:", error);
    res.status(500).json({ message: "대시보드 리스트 조회 실패" });
  }
};

export const getDashboardById = async (req, res) => {
  try {
    const id = req.query.id;

    if (!id) {
      return res.status(400).json({ message: "id 값이 필요합니다" });
    }

    await client.connect();
    const settingDb = client.db(settingDbName);
    const settingCollection = settingDb.collection(settingCollectionName);

    const dashboard = await settingCollection.findOne({
      _id: new ObjectId(id),
      status: { $ne: "DELETED" },
    });

    if (!dashboard) {
      return res.status(404).json({ message: "대시보드를 찾을 수 없습니다" });
    }

    res.status(200).json(dashboard);
  } catch (error) {
    console.error("Get Dashboard By Id Error:", error);
    res.status(500).json({ message: "대시보드 조회 실패" });
  }
};

export const updateDashboard = async (req, res) => {
  try {
    const { id, dashboardInfo, detailInfo } = req.body;

    if (!id) {
      return res.status(400).json({ message: "id 값이 필요합니다" });
    }

    await client.connect();
    const settingDb = client.db(settingDbName);
    const settingCollection = settingDb.collection(settingCollectionName);

    const updateFields = {
      updatedAt: formattedDate(new Date()),
    };

    if (dashboardInfo) updateFields.dashboardInfo = dashboardInfo;
    if (detailInfo) {
      updateFields.detailInfo = detailInfo;

      const hasGroupItems =
        Array.isArray(detailInfo.groupData) && detailInfo.groupData.length > 0;
      const hasAggregateItems =
        Array.isArray(detailInfo.aggregateData) &&
        detailInfo.aggregateData.length > 0;

      if (hasGroupItems && hasAggregateItems) {
        updateFields.status = "COMPLETED";
      }
    }

    const result = await settingCollection.updateOne(
      { _id: new ObjectId(id), status: { $ne: "DELETED" } },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "대시보드를 찾을 수 없습니다" });
    }

    res.status(200).json({ message: "대시보드 업데이트 성공" });
  } catch (error) {
    console.error("Update Dashboard Error:", error);
    res.status(500).json({ message: "대시보드 업데이트 실패" });
  }
};

export const deleteDashboard = async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ message: "id 값이 필요합니다" });
    }

    await client.connect();
    const settingDb = client.db(settingDbName);
    const settingCollection = settingDb.collection(settingCollectionName);

    const result = await settingCollection.updateOne(
      { _id: new ObjectId(id), status: { $ne: "DELETED" } },
      { $set: { status: "DELETED", updatedAt: new Date().toISOString() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "대시보드를 찾을 수 없습니다" });
    }

    res.status(200).json({ message: "대시보드 삭제 성공" });
  } catch (error) {
    console.error("Delete Dashboard Error:", error);
    res.status(500).json({ message: "대시보드 삭제 실패" });
  }
};
