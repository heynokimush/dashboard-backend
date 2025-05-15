import client from "../db/mongoClient.js";

export const getStatisticsList = async (req, res) => {
  try {
    await client.connect();
    const db = client.db("statisticsData");
    const collection = db.collection("statisticsData");

    const statistics = await collection.find({}).toArray();
    res.status(200).json({ statistics });
  } catch (error) {
    console.error("통계 데이터 조회 오류:", error);
    res.status(500).json({ message: "서버 오류" });
  } finally {
    await client.close();
  }
};
