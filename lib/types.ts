export type RSVPStatus="PENDING"|"GO"|"NO";
export type GuestInvite={id:string;label:string;message:string|null;confirmed:boolean;people:{id:string;name:string;status:RSVPStatus;answeredAt:string|null}[]};
