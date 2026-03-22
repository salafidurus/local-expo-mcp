import { z } from "zod";

const projectRootSchema = z.string().min(1);
const optionalPortSchema = z.number().int().min(1).max(65535).optional();
const limitSchema = z.number().int().min(1).max(1000).optional();
const optionalDeviceIdSchema = z.string().min(1).optional();
const appIdSchema = z.string().min(1);
const coordinateSchema = z.number().finite().min(0);
const deviceTextSchema = z.string().min(1);
const deviceKeySchema = z.string().min(1);

export const toolSchemas: Record<string, z.ZodTypeAny> = {
  project_inspect: z.object({
    projectRoot: projectRootSchema
  }).strict(),
  metro_start: z.object({
    projectRoot: projectRootSchema,
    port: optionalPortSchema,
    clear: z.boolean().optional()
  }).strict(),
  metro_stop: z.object({
    projectRoot: projectRootSchema
  }).strict(),
  metro_restart: z.object({
    projectRoot: projectRootSchema,
    port: z.number().int().min(1).max(65535),
    clear: z.boolean().optional()
  }).strict(),
  metro_status: z.object({
    projectRoot: projectRootSchema
  }).strict(),
  metro_logs_recent: z.object({
    projectRoot: projectRootSchema,
    limit: limitSchema
  }).strict(),
  metro_errors_recent: z.object({
    projectRoot: projectRootSchema,
    limit: limitSchema
  }).strict(),
  dev_server_attach: z.object({
    projectRoot: projectRootSchema
  }).strict(),
  android_run: z.object({
    projectRoot: projectRootSchema
  }).strict(),
  device_list: z.object({}).strict(),
  device_logs_recent: z.object({
    limit: limitSchema
  }).strict(),
  device_screenshot: z.object({
    deviceId: optionalDeviceIdSchema
  }).strict(),
  device_dump_ui: z.object({
    deviceId: optionalDeviceIdSchema
  }).strict(),
  device_tap: z.object({
    x: coordinateSchema,
    y: coordinateSchema,
    deviceId: optionalDeviceIdSchema
  }).strict(),
  device_swipe: z.object({
    startX: coordinateSchema,
    startY: coordinateSchema,
    endX: coordinateSchema,
    endY: coordinateSchema,
    duration: z.number().int().min(1).optional(),
    deviceId: optionalDeviceIdSchema
  }).strict(),
  device_type_text: z.object({
    text: deviceTextSchema,
    deviceId: optionalDeviceIdSchema
  }).strict(),
  device_key_press: z.object({
    key: deviceKeySchema,
    deviceId: optionalDeviceIdSchema
  }).strict(),
  device_app_launch: z.object({
    appId: appIdSchema,
    deviceId: optionalDeviceIdSchema
  }).strict(),
  device_app_terminate: z.object({
    appId: appIdSchema,
    deviceId: optionalDeviceIdSchema
  }).strict(),
  device_foreground_app: z.object({
    deviceId: optionalDeviceIdSchema
  }).strict(),
  session_summary: z.object({
    projectRoot: projectRootSchema
  }).strict()
};
