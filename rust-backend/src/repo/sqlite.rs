use rusqlite::OptionalExtension;
use tokio_rusqlite::Connection;

use crate::errors::AppError;
use crate::types::report::ResearchReport;

#[derive(Clone)]
pub struct SqliteRepo {
    conn: Connection,
}

impl SqliteRepo {
    pub async fn new(db_path: &str) -> Result<Self, AppError> {
        let conn = Connection::open(db_path)
            .await
            .map_err(|e| AppError::Database(format!("Failed to open DB: {e}")))?;

        let repo = Self { conn };
        repo.init_db().await?;
        Ok(repo)
    }

    async fn init_db(&self) -> Result<(), AppError> {
        self.conn
            .call(|conn| {
                conn.execute_batch(
                    "CREATE TABLE IF NOT EXISTS reports (
                        report_id TEXT PRIMARY KEY,
                        run_date TEXT NOT NULL,
                        data TEXT NOT NULL
                    )",
                )?;

                Ok(())
            })
            .await
            .map_err(|e| AppError::Database(format!("Failed to init DB: {e}")))?;
        tracing::info!("SQLite database initialized");
        Ok(())
    }

    pub async fn save_report(&self, report: &ResearchReport) -> Result<(), AppError> {
        let report_id = report.report_id.clone();
        let run_date = report.run_date.to_rfc3339();
        let data = serde_json::to_string(report)
            .map_err(|e| AppError::Internal(format!("Serialization failed: {e}")))?;

        self.conn
            .call(move |conn| {
                conn.execute(
                    "INSERT OR REPLACE INTO reports (report_id, run_date, data) VALUES (?1, ?2, ?3)",
                    rusqlite::params![report_id, run_date, data],
                )?;
                Ok(())
            })
            .await
            .map_err(|e| AppError::Database(format!("Failed to save report: {e}")))?;

        tracing::info!("Saved report {}", report.report_id);
        Ok(())
    }

    pub async fn get_report(&self, report_id: &str) -> Result<Option<ResearchReport>, AppError> {
        let report_id = report_id.to_string();

        self.conn
            .call(move |conn| {
                let mut stmt = conn.prepare("SELECT data FROM reports WHERE report_id = ?1")?;
                let result = stmt
                    .query_row(rusqlite::params![report_id], |row| row.get::<_, String>(0))
                    .optional()?;
                Ok(result)
            })
            .await
            .map_err(|e| AppError::Database(format!("Failed to get report: {e}")))
            .and_then(|opt| match opt {
                Some(data) => serde_json::from_str(&data)
                    .map(Some)
                    .map_err(|e| AppError::Internal(format!("Deserialization failed: {e}"))),
                None => Ok(None),
            })
    }

    pub async fn list_reports(&self, limit: usize) -> Result<Vec<ResearchReport>, AppError> {
        let limit = limit as i64;

        self.conn
            .call(move |conn| {
                let mut stmt =
                    conn.prepare("SELECT data FROM reports ORDER BY run_date DESC LIMIT ?1")?;
                let rows = stmt
                    .query_map(rusqlite::params![limit], |row| row.get::<_, String>(0))?
                    .collect::<Result<Vec<_>, _>>()?;
                Ok(rows)
            })
            .await
            .map_err(|e| AppError::Database(format!("Failed to list reports: {e}")))
            .and_then(|rows| {
                rows.into_iter()
                    .map(|data| {
                        serde_json::from_str(&data).map_err(|e| {
                            AppError::Internal(format!("Deserialization failed: {e}"))
                        })
                    })
                    .collect()
            })
    }
}
