import api from './index'
import type { Result } from './user'

/**
 * 论坛模块 API
 * ============================================================
 * 与后端 ForumController 对齐：
 * - add 系列接口使用 @RequestBody 接收参数，前端用 POST + JSON body；
 * - 组团/圈子 select、search 接口使用 @GetMapping 接收查询参数，前端用 GET + query string。
 * ============================================================
 */

/** 组团信息 */
export interface TeamUp {
    id: number;
    type: string;
    title: string;
    leader: number;
    leaderName: string;
    startTime: string;
    createAt: string;
    updateAt: string;
    /** 允许的最多参与人数（后端限制不可大于 10） */
    peopleNumber: number;
    /** 已经参加的人数 */
    participateNumber: number;
    /** 当前查询者是否已参与：后端 COUNT 结果，大于 0 即已参与 */
    joined: number;
}

/** 分页结果 */
export interface PageResult<T> {
    total: number;
    rows: T[];
}

/**
 * 分页查询参数（与后端 ItemQueryParam 对齐）。
 * 注意：ItemQueryParam 没有 category 字段，传入会被 Jackson 拒绝。
 */
export interface ItemQueryParam {
    beginTime?: string
    endTime?: string
    pageNumber?: number
    pageSize?: number
    sortRules?: string
    /** 仅热门活动分页使用：0 未开始，1 已开始，2 已结束 */
    status?: number
    /** 组团分类（自习/游戏/电影...）：仅组团分页使用，"全部" 时不传 */
    type?: string
    /** 圈子三合一接口使用：Dynamics=圈子动态，Task=跑腿任务，Event=热门活动 */
    option?: string
}

/** 分页查询组团列表（后端 @GetMapping，用 GET 携带查询参数） */
export const getTeamUp = (params: ItemQueryParam) => {
    return api.get<any, Result<PageResult<TeamUp>>>('/forum/select', { params })
}

/**
 * 发起组团提交参数
 * 注意：leader（当前用户ID）/leaderName/createAt/updateAt 均由后端填充，前端无需传递
 */
export interface AddTeamUpParam {
    type: string;
    title: string;
    startTime: string;
    /** 允许的最多参与人数（不可大于 10） */
    peopleNumber: number;
}

/** 添加组团信息 */
export const addTeamUp = (teamUp: AddTeamUpParam) => {
    return api.post<any, Result<Object>>('/forum/add', teamUp)
}

/** 组团模糊搜索（后端 @GetMapping + @RequestParam keyword） */
export const searchTeamUp = (keyword: string) => {
    return api.get<any, Result<PageResult<TeamUp>>>('/forum/search', { params: { keyword } })
}

/** 我的参与（我参与过的组团，后端 @GetMapping 接收分页参数） */
export const getMyJoin = (params: ItemQueryParam) => {
    return api.get<any, Result<PageResult<TeamUp>>>('/forum/myJoin', { params })
}

/** 我的创建（我创建的组团） */
export const getMyCreate = () => {
    return api.get<any, Result<PageResult<TeamUp>>>('/forum/myCreate')
}

/** 根据组团id查询对应的详细信息 */
export const detailedTeamUp = (id: number | string) => {
    return api.get<any, Result<TeamUp>>(`/forum/detailed/${id}`)
}

/** 参加组团（重复参加后端会返回失败，建议先用详情接口的 joined 判断是否已参与） */
export const joinTeamUp = (teamUpId: number | string) => {
    return api.post<any, Result<Object>>(`/forum/join/${teamUpId}`)
}

/** 组团评论（新增评论提交参数，与后端 Comment 实体对齐） */
export interface AddCommentParam {
    teamupId: number;
    parentId: number;
    text: string;
    picture: string;
    son: number;
    createTime: string;
    userId: number;
    replyUserId: number | null;
}

/** 组团评论视图对象（与后端 CommentVO 对齐） */
export interface CommentVO {
    id: number;
    teamupId: number;
    parentId: number;
    text: string;
    picture: string;
    son: number;
    createTime: string;
    level: number;
    userId: number;
    userAvatar: string;
    userName: string;
    replyUserId: number;
    replyUserAvatar: string;
    replyUserName: string;
}

/** 发表组团评论 */
export const addComment = (comment: AddCommentParam) => {
    return api.post<any, Result<Object>>('/forum/add/comment', comment)
}

/** 查看组团评论 */
export const selectComment = (teamUpId: number) => {
    return api.get<any, Result<PageResult<CommentVO>>>('/forum/select/comment', { params: { teamUpId } })
}

/**
 * 查看某条评论之前的所有互动（后端 @PathVariable id，传评论 id）
 */
export const selectCommentInteraction = (commentId: number) => {
    return api.get<any, Result<PageResult<CommentVO>>>(`/forum/select/comment/${commentId}`)
}

/** 圈子评论（新增评论提交参数，与后端 CommentCircle 实体对齐） */
export interface AddCircleCommentParam {
    /** 圈子 id（后端 Long 大整数可能以字符串形式返回，故兼容 number|string） */
    circleId: number | string;
    parentId: number;
    text: string;
    picture: string;
    son: number;
    createTime: string;
    userId: number;
    replyUserId: number | null;
}

/** 圈子评论视图对象（与后端 CommentCircleVO 对齐） */
export interface CommentCircleVO {
    id: number;
    circleId: number;
    parentId: number;
    text: string;
    picture: string;
    son: number;
    createTime: string;
    level: number;
    userId: number;
    userAvatar: string;
    userName: string;
    replyUserId: number;
    replyUserAvatar: string;
    replyUserName: string;
}

/** 发表圈子评论 */
export const addCircleComment = (comment: AddCircleCommentParam) => {
    return api.post<any, Result<Object>>('/forum/add/comment/circle', comment)
}

/** 查看圈子评论（后端强制要求必传查询参数 circleId） */
export const selectCircleComment = (circleId: number | string) => {
    return api.get<any, Result<PageResult<CommentCircleVO>>>('/forum/select/comment/circle', { params: { circleId } })
}

/** 查看圈子某条评论之前的所有互动 */
export const selectCircleCommentInteraction = (commentId: number) => {
    return api.get<any, Result<PageResult<CommentCircleVO>>>(`/forum/select/comment/circle/${commentId}`)
}

/** 圈子模块复合实体（与后端 Circle 对齐，含 participant） */
export interface Circle {
    id: number;
    userId: number;
    type: string;
    content: string;
    bounty: number;
    requestContent: string;
    note: string;
    title: string;
    picture: string;
    startTime: string;
    endTime: string;
    /** 活动详情接口返回：当前登录用户是否已参加该活动（COUNT 结果，大于 0 即已参加） */
    participant?: number;
    /** 活动详情接口返回：该活动的参加人数 */
    numberOfParticipants?: number;
    /** 分类：Dynamics / Task / Event（提交时由前端填充，后端校验） */
    category: string;
    /** 创建时间（后端返回 create_time） */
    createTime: string;
    /** 总点赞数（详情接口返回，动态/活动为 likeCount，跑腿任务为 likeNumber） */
    likeCount?: number;
    /** 总点赞数（跑腿任务详情接口返回） */
    likeNumber?: number;
    /** 当前登录用户是否已点赞：1=已点赞，0=未点赞（详情接口返回） */
    isLike?: number;
    /** 跑腿任务是否已有人接单（详情接口返回，由 accept_task 表统计得出） */
    total?: boolean;
}

/**
 * 解析后端返回的时间字符串为时间戳。
 * 兼容 "yyyy-MM-dd"、"yyyy-MM-dd HH:mm:ss"、ISO "yyyy-MM-ddTHH:mm:ss"；
 * 仅日期时，isEnd 决定按当天 0 点还是 23:59:59 处理。
 */
const parseActivityTime = (time?: string, isEnd = false): number => {
    if (!time) return NaN
    const t = String(time).trim()
    if (!t) return NaN
    // iOS/Safari 不识别空格分隔的日期时间，统一替换为 T 再解析
    const normalized = t.includes(':') ? t.replace(' ', 'T') : `${t}T${isEnd ? '23:59:59' : '00:00:00'}`
    return new Date(normalized).getTime()
}

/**
 * 由开始/结束时间推导热门活动状态：0 未开始，1 已开始，2 已结束。
 * 后端已不再返回 status 字段；时间缺失或无法解析时返回 -1（调用方显示"未知"）。
 */
export const getActivityStatus = (startTime?: string, endTime?: string): number => {
    const start = parseActivityTime(startTime)
    const end = parseActivityTime(endTime, true)
    if (Number.isNaN(start) || Number.isNaN(end)) return -1
    const now = Date.now()
    if (now < start) return 0
    if (now > end) return 2
    return 1
}

/** 圈子动态提交参数 */
export interface AddCircleDynamicParam {
    type: string;
    content: string;
}

/** 跑腿任务提交参数 */
export interface AddCircleTaskParam {
    type: string;
    bounty: number;
    requestContent: string;
    note: string;
}

/** 创建活动提交参数 */
export interface AddCircleActivityParam {
    title: string;
    picture: string;
    startTime: string;
    endTime: string;
}

/** 添加圈子动态信息（category 固定为 Dynamics，后端校验） */
export const addCircleDynamic = (data: AddCircleDynamicParam) => {
    return api.post<any, Result<Object>>('/forum/add/dynamic', { ...data, category: 'Dynamics' })
}

/** 分页查询圈子动态（后端 @GetMapping，用 GET 携带查询参数） */
export const getCircleDynamics = (params: ItemQueryParam) => {
    return api.get<any, Result<PageResult<Circle>>>('/forum/select/dynamic', { params })
}

/** 圈子动态模糊搜索（后端 @RequestParam keyword） */
export const searchCircleDynamics = (keyword: string) => {
    return api.get<any, Result<PageResult<Circle>>>('/forum/search/dynamic', { params: { keyword } })
}

/** 添加发布任务信息（category 固定为 Task，后端校验） */
export const addCircleTask = (data: AddCircleTaskParam) => {
    return api.post<any, Result<Object>>('/forum/add/task', { ...data, category: 'Task' })
}

/** 分页查询发布任务（后端 @GetMapping，用 GET 携带查询参数） */
export const getCircleTasks = (params: ItemQueryParam) => {
    return api.get<any, Result<PageResult<Circle>>>('/forum/select/task', { params })
}

/** 发布任务模糊搜索（后端 @RequestParam keyword） */
export const searchCircleTasks = (keyword: string) => {
    return api.get<any, Result<PageResult<Circle>>>('/forum/search/task', { params: { keyword } })
}

/**
 * 接取跑腿任务（circleId 为任务帖子 id）
 * 详情接口返回的 total 表示是否已有人接单，为 true 时不应再调用本接口。
 */
export const acceptTask = (circleId: number | string) => {
    return api.get<any, Result<Object>>(`/forum/join/task/${circleId}`)
}

/**
 * 加入热门活动（activityId 为活动帖子 id）
 * 重复加入后端返回 code=0 并提示「你已加入过该活动」。
 */
export const joinActivity = (activityId: number | string) => {
    return api.get<any, Result<Object>>(`/forum/join/activity/${activityId}`)
}

/** 添加创建活动信息（category 固定为 Event，后端校验） */
export const addCircleActivity = (data: AddCircleActivityParam) => {
    return api.post<any, Result<Object>>('/forum/add/activity', { ...data, category: 'Event' })
}

/** 分页查询热门活动（后端 @GetMapping，用 GET 携带查询参数） */
export const getCircleActivities = (params: ItemQueryParam) => {
    return api.get<any, Result<PageResult<Circle>>>('/forum/select/activity', { params })
}

/** 热门活动模糊搜索（后端 @RequestParam keyword） */
export const searchCircleActivities = (keyword: string) => {
    return api.get<any, Result<PageResult<Circle>>>('/forum/search/activity', { params: { keyword } })
}

/**
 * 圈子详细信息（与后端 /forum/detailed/{option}/{id} 对齐）
 * option 区分模块：Dynamic=圈子动态，Task=跑腿任务，Activity=热门活动
 */
export const detailedCircleUpdates = (
    id: number | string,
    option: 'Dynamic' | 'Task' | 'Activity',
) => {
    return api.get<any, Result<Circle>>(`/forum/detailed/${option}/${id}`)
}

/**
 * 圈子点赞（圈子动态/任务/活动共用一个接口，circleId 为帖子 id）
 * 注意：只有点赞，没有取消点赞；重复点赞后端会返回失败。
 * 建议先根据详情接口的 isLike 判断，已点赞则禁用按钮，避免重复请求。
 */
export const likeCircle = (circleId: number | string) => {
    return api.get<any, Result<Object>>(`/forum/circle/like/${circleId}`)
}

/** 圈子热榜条目（热榜接口仅返回简略信息，title 可能为 null） */
export interface HotRankCircle {
    id: number | string
    /** 动态/任务模块无标题时可能为 null，需前端按 category 补充 */
    title: string | null
    /** 分类：Dynamics / Task / Event */
    category: string
}

/** 查看我参加的圈子（圈子动态/跑腿任务/热门活动混合返回，靠 category 区分） */
export const getMyParticipateCircle = () => {
    return api.get<any, Result<PageResult<Circle>>>('/forum/select/myParticipateCircle')
}

/**
 * 分页查询我参与的跑腿任务（即我接取过的任务）
 * 后端返回 Result<PageResult<Circle>>；该接口的 SQL 未查询 category，
 * 前端需自行按 Task 分类渲染与跳转。
 */
export const getMyTakeTask = (params: ItemQueryParam) => {
    return api.get<any, Result<PageResult<Circle>>>('/forum/take/myTakeTask', { params })
}

/**
 * 分页查询我加入的热门活动
 * 后端返回 Result<PageResult<Circle>>；该接口的 SQL 未查询 category，
 * 前端需自行按 Event 分类渲染与跳转。
 */
export const getMyJoinActivity = (params: ItemQueryParam) => {
    return api.get<any, Result<PageResult<Circle>>>('/forum/take/myJoinActivity', { params })
}

/**
 * 分页查询我创建的圈子内容（动态/任务/活动三合一）
 * 由 option 决定查询内容：Dynamics=圈子动态，Task=跑腿任务，Event=热门活动；
 * 后端各分支 SQL 均未查询 category，前端需按 option 补齐分类用于渲染与跳转。
 */
export const getMyCreateCircle = (params: ItemQueryParam) => {
    return api.get<any, Result<PageResult<Circle>>>('/forum/myCreate/circle', { params })
}

/**
 * 查看圈子热榜（后端 Redis 热度榜单取 top10，返回简略信息）
 * 返回项仅含 id + title + category（title 可能为 null，需前端按 category 补充显示）
 */
export const getHotRankCircle = () => {
    return api.get<any, Result<HotRankCircle[]>>('/forum/select/hortSort/circle')
}
