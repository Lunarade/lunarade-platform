import { ObjectID } from "mongodb";

export interface MonitorRequest {
    monitorId: ObjectID,
    error?: any,
    monitorConfig: Monitor,
    statusCode?: number,
    body?: any,
    timestamp: Date,
    duration?: number,
    headers?: any,
    isError: boolean,
    expireAt: Date
}

export interface Monitor {
    _id: ObjectID,
    timestamp: Date,
    expireAt: Date,
    body: any,
    url: string,
    method: string,
    headers: any,
    enabled: boolean,
    name: string,
    testCode: string,
    codeOnly: boolean,
    interval: number
}

export interface APIRequest {
    _id: ObjectID,
    requestBody: string,
    requestHeaders: string,
    responseBody: string,
    responseHeaders: string,
    uri: string,
    statusCode: number,
    method: string,
    signature: string,
    durationMs: number,
    version: string,
    receivedAt: Date,
    expireAt: Date
}

export interface APIRequestVersionStat {
    _id: ObjectID,
    signature: string,
    version: string,
    successfulRequests: number,
    failedRequests: number,
    durationMsTotal: number,
    expireAt: Date,
    timestamp: Date
}

export interface AggregatedAPIRequestVersionStat {
    _id: ObjectID,
    signature: string,
    version: string,
    successfulRequests: number,
    failedRequests: number,
    durationMsTotal: number,
    expireAt: Date,
    timestamp: Date
}