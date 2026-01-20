// logger.js
import winston from "winston";
import moment from "moment-timezone"; 
import 'winston-daily-rotate-file';
  

const { combine, timestamp, printf, colorize } = winston.format;

// Log format
const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${message}`;
});

// Daily rotate file transport
const transport = new winston.transports.DailyRotateFile({
  filename: "logs/%DATE%.log",       // log file per day
  datePattern: "YYYY-MM-DD",         // daily rotation
  zippedArchive: true,              // compress old logs if true
  maxSize: "20m",                    // optional limit per file
  maxFiles: "14d",                   // keep logs for 14 days
  level: "info",                     // set minimum log level
  dirname: "logs",                   // log folder
  utc: false,                        // use local timezone
  format: combine(
    timestamp({
      format: () => moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss"),
    }),
    logFormat
  ),
});

const logger = winston.createLogger({ 
  transports: [
    transport,
    new winston.transports.Console({
      format: combine(colorize(), logFormat),
    }),
  ],
});

export default logger;
