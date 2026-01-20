export type GenericResponse<T> = {
    success: boolean;
    data: T;
    message: string;
};


export type GenericResponseCode<T> = {
    status:number, 
    data:T,
    message:string
}