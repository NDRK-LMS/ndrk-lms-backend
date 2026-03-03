import type * as runtime from "@prisma/client/runtime/client";
import type * as Prisma from "../internal/prismaNamespace.js";
export type UserModel = runtime.Types.Result.DefaultSelection<Prisma.$UserPayload>;
export type AggregateUser = {
    _count: UserCountAggregateOutputType | null;
    _min: UserMinAggregateOutputType | null;
    _max: UserMaxAggregateOutputType | null;
};
export type UserMinAggregateOutputType = {
    id: string | null;
    email: string | null;
    passwordHash: string | null;
    fullName: string | null;
    role: string | null;
    status: string | null;
    googleId: string | null;
    avatarUrl: string | null;
    mfaEnabled: boolean | null;
    mfaSecret: string | null;
    mfaRecoveryCodes: string | null;
    lastLoginAt: Date | null;
    createdAt: Date | null;
    updatedAt: Date | null;
};
export type UserMaxAggregateOutputType = {
    id: string | null;
    email: string | null;
    passwordHash: string | null;
    fullName: string | null;
    role: string | null;
    status: string | null;
    googleId: string | null;
    avatarUrl: string | null;
    mfaEnabled: boolean | null;
    mfaSecret: string | null;
    mfaRecoveryCodes: string | null;
    lastLoginAt: Date | null;
    createdAt: Date | null;
    updatedAt: Date | null;
};
export type UserCountAggregateOutputType = {
    id: number;
    email: number;
    passwordHash: number;
    fullName: number;
    role: number;
    status: number;
    googleId: number;
    avatarUrl: number;
    mfaEnabled: number;
    mfaSecret: number;
    mfaRecoveryCodes: number;
    lastLoginAt: number;
    createdAt: number;
    updatedAt: number;
    _all: number;
};
export type UserMinAggregateInputType = {
    id?: true;
    email?: true;
    passwordHash?: true;
    fullName?: true;
    role?: true;
    status?: true;
    googleId?: true;
    avatarUrl?: true;
    mfaEnabled?: true;
    mfaSecret?: true;
    mfaRecoveryCodes?: true;
    lastLoginAt?: true;
    createdAt?: true;
    updatedAt?: true;
};
export type UserMaxAggregateInputType = {
    id?: true;
    email?: true;
    passwordHash?: true;
    fullName?: true;
    role?: true;
    status?: true;
    googleId?: true;
    avatarUrl?: true;
    mfaEnabled?: true;
    mfaSecret?: true;
    mfaRecoveryCodes?: true;
    lastLoginAt?: true;
    createdAt?: true;
    updatedAt?: true;
};
export type UserCountAggregateInputType = {
    id?: true;
    email?: true;
    passwordHash?: true;
    fullName?: true;
    role?: true;
    status?: true;
    googleId?: true;
    avatarUrl?: true;
    mfaEnabled?: true;
    mfaSecret?: true;
    mfaRecoveryCodes?: true;
    lastLoginAt?: true;
    createdAt?: true;
    updatedAt?: true;
    _all?: true;
};
export type UserAggregateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput | Prisma.UserOrderByWithRelationInput[];
    cursor?: Prisma.UserWhereUniqueInput;
    take?: number;
    skip?: number;
    _count?: true | UserCountAggregateInputType;
    _min?: UserMinAggregateInputType;
    _max?: UserMaxAggregateInputType;
};
export type GetUserAggregateType<T extends UserAggregateArgs> = {
    [P in keyof T & keyof AggregateUser]: P extends '_count' | 'count' ? T[P] extends true ? number : Prisma.GetScalarType<T[P], AggregateUser[P]> : Prisma.GetScalarType<T[P], AggregateUser[P]>;
};
export type UserGroupByArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithAggregationInput | Prisma.UserOrderByWithAggregationInput[];
    by: Prisma.UserScalarFieldEnum[] | Prisma.UserScalarFieldEnum;
    having?: Prisma.UserScalarWhereWithAggregatesInput;
    take?: number;
    skip?: number;
    _count?: UserCountAggregateInputType | true;
    _min?: UserMinAggregateInputType;
    _max?: UserMaxAggregateInputType;
};
export type UserGroupByOutputType = {
    id: string;
    email: string;
    passwordHash: string | null;
    fullName: string;
    role: string;
    status: string;
    googleId: string | null;
    avatarUrl: string | null;
    mfaEnabled: boolean;
    mfaSecret: string | null;
    mfaRecoveryCodes: string | null;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    _count: UserCountAggregateOutputType | null;
    _min: UserMinAggregateOutputType | null;
    _max: UserMaxAggregateOutputType | null;
};
type GetUserGroupByPayload<T extends UserGroupByArgs> = Prisma.PrismaPromise<Array<Prisma.PickEnumerable<UserGroupByOutputType, T['by']> & {
    [P in ((keyof T) & (keyof UserGroupByOutputType))]: P extends '_count' ? T[P] extends boolean ? number : Prisma.GetScalarType<T[P], UserGroupByOutputType[P]> : Prisma.GetScalarType<T[P], UserGroupByOutputType[P]>;
}>>;
export type UserWhereInput = {
    AND?: Prisma.UserWhereInput | Prisma.UserWhereInput[];
    OR?: Prisma.UserWhereInput[];
    NOT?: Prisma.UserWhereInput | Prisma.UserWhereInput[];
    id?: Prisma.StringFilter<"User"> | string;
    email?: Prisma.StringFilter<"User"> | string;
    passwordHash?: Prisma.StringNullableFilter<"User"> | string | null;
    fullName?: Prisma.StringFilter<"User"> | string;
    role?: Prisma.StringFilter<"User"> | string;
    status?: Prisma.StringFilter<"User"> | string;
    googleId?: Prisma.StringNullableFilter<"User"> | string | null;
    avatarUrl?: Prisma.StringNullableFilter<"User"> | string | null;
    mfaEnabled?: Prisma.BoolFilter<"User"> | boolean;
    mfaSecret?: Prisma.StringNullableFilter<"User"> | string | null;
    mfaRecoveryCodes?: Prisma.StringNullableFilter<"User"> | string | null;
    lastLoginAt?: Prisma.DateTimeNullableFilter<"User"> | Date | string | null;
    createdAt?: Prisma.DateTimeFilter<"User"> | Date | string;
    updatedAt?: Prisma.DateTimeFilter<"User"> | Date | string;
    sessions?: Prisma.SessionListRelationFilter;
    passwordResetTokens?: Prisma.PasswordResetTokenListRelationFilter;
};
export type UserOrderByWithRelationInput = {
    id?: Prisma.SortOrder;
    email?: Prisma.SortOrder;
    passwordHash?: Prisma.SortOrderInput | Prisma.SortOrder;
    fullName?: Prisma.SortOrder;
    role?: Prisma.SortOrder;
    status?: Prisma.SortOrder;
    googleId?: Prisma.SortOrderInput | Prisma.SortOrder;
    avatarUrl?: Prisma.SortOrderInput | Prisma.SortOrder;
    mfaEnabled?: Prisma.SortOrder;
    mfaSecret?: Prisma.SortOrderInput | Prisma.SortOrder;
    mfaRecoveryCodes?: Prisma.SortOrderInput | Prisma.SortOrder;
    lastLoginAt?: Prisma.SortOrderInput | Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
    sessions?: Prisma.SessionOrderByRelationAggregateInput;
    passwordResetTokens?: Prisma.PasswordResetTokenOrderByRelationAggregateInput;
};
export type UserWhereUniqueInput = Prisma.AtLeast<{
    id?: string;
    email?: string;
    googleId?: string;
    AND?: Prisma.UserWhereInput | Prisma.UserWhereInput[];
    OR?: Prisma.UserWhereInput[];
    NOT?: Prisma.UserWhereInput | Prisma.UserWhereInput[];
    passwordHash?: Prisma.StringNullableFilter<"User"> | string | null;
    fullName?: Prisma.StringFilter<"User"> | string;
    role?: Prisma.StringFilter<"User"> | string;
    status?: Prisma.StringFilter<"User"> | string;
    avatarUrl?: Prisma.StringNullableFilter<"User"> | string | null;
    mfaEnabled?: Prisma.BoolFilter<"User"> | boolean;
    mfaSecret?: Prisma.StringNullableFilter<"User"> | string | null;
    mfaRecoveryCodes?: Prisma.StringNullableFilter<"User"> | string | null;
    lastLoginAt?: Prisma.DateTimeNullableFilter<"User"> | Date | string | null;
    createdAt?: Prisma.DateTimeFilter<"User"> | Date | string;
    updatedAt?: Prisma.DateTimeFilter<"User"> | Date | string;
    sessions?: Prisma.SessionListRelationFilter;
    passwordResetTokens?: Prisma.PasswordResetTokenListRelationFilter;
}, "id" | "email" | "googleId">;
export type UserOrderByWithAggregationInput = {
    id?: Prisma.SortOrder;
    email?: Prisma.SortOrder;
    passwordHash?: Prisma.SortOrderInput | Prisma.SortOrder;
    fullName?: Prisma.SortOrder;
    role?: Prisma.SortOrder;
    status?: Prisma.SortOrder;
    googleId?: Prisma.SortOrderInput | Prisma.SortOrder;
    avatarUrl?: Prisma.SortOrderInput | Prisma.SortOrder;
    mfaEnabled?: Prisma.SortOrder;
    mfaSecret?: Prisma.SortOrderInput | Prisma.SortOrder;
    mfaRecoveryCodes?: Prisma.SortOrderInput | Prisma.SortOrder;
    lastLoginAt?: Prisma.SortOrderInput | Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
    _count?: Prisma.UserCountOrderByAggregateInput;
    _max?: Prisma.UserMaxOrderByAggregateInput;
    _min?: Prisma.UserMinOrderByAggregateInput;
};
export type UserScalarWhereWithAggregatesInput = {
    AND?: Prisma.UserScalarWhereWithAggregatesInput | Prisma.UserScalarWhereWithAggregatesInput[];
    OR?: Prisma.UserScalarWhereWithAggregatesInput[];
    NOT?: Prisma.UserScalarWhereWithAggregatesInput | Prisma.UserScalarWhereWithAggregatesInput[];
    id?: Prisma.StringWithAggregatesFilter<"User"> | string;
    email?: Prisma.StringWithAggregatesFilter<"User"> | string;
    passwordHash?: Prisma.StringNullableWithAggregatesFilter<"User"> | string | null;
    fullName?: Prisma.StringWithAggregatesFilter<"User"> | string;
    role?: Prisma.StringWithAggregatesFilter<"User"> | string;
    status?: Prisma.StringWithAggregatesFilter<"User"> | string;
    googleId?: Prisma.StringNullableWithAggregatesFilter<"User"> | string | null;
    avatarUrl?: Prisma.StringNullableWithAggregatesFilter<"User"> | string | null;
    mfaEnabled?: Prisma.BoolWithAggregatesFilter<"User"> | boolean;
    mfaSecret?: Prisma.StringNullableWithAggregatesFilter<"User"> | string | null;
    mfaRecoveryCodes?: Prisma.StringNullableWithAggregatesFilter<"User"> | string | null;
    lastLoginAt?: Prisma.DateTimeNullableWithAggregatesFilter<"User"> | Date | string | null;
    createdAt?: Prisma.DateTimeWithAggregatesFilter<"User"> | Date | string;
    updatedAt?: Prisma.DateTimeWithAggregatesFilter<"User"> | Date | string;
};
export type UserCreateInput = {
    id?: string;
    email: string;
    passwordHash?: string | null;
    fullName: string;
    role: string;
    status?: string;
    googleId?: string | null;
    avatarUrl?: string | null;
    mfaEnabled?: boolean;
    mfaSecret?: string | null;
    mfaRecoveryCodes?: string | null;
    lastLoginAt?: Date | string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    sessions?: Prisma.SessionCreateNestedManyWithoutUserInput;
    passwordResetTokens?: Prisma.PasswordResetTokenCreateNestedManyWithoutUserInput;
};
export type UserUncheckedCreateInput = {
    id?: string;
    email: string;
    passwordHash?: string | null;
    fullName: string;
    role: string;
    status?: string;
    googleId?: string | null;
    avatarUrl?: string | null;
    mfaEnabled?: boolean;
    mfaSecret?: string | null;
    mfaRecoveryCodes?: string | null;
    lastLoginAt?: Date | string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    sessions?: Prisma.SessionUncheckedCreateNestedManyWithoutUserInput;
    passwordResetTokens?: Prisma.PasswordResetTokenUncheckedCreateNestedManyWithoutUserInput;
};
export type UserUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    email?: Prisma.StringFieldUpdateOperationsInput | string;
    passwordHash?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    fullName?: Prisma.StringFieldUpdateOperationsInput | string;
    role?: Prisma.StringFieldUpdateOperationsInput | string;
    status?: Prisma.StringFieldUpdateOperationsInput | string;
    googleId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    avatarUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    mfaEnabled?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    mfaSecret?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    mfaRecoveryCodes?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    lastLoginAt?: Prisma.NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    sessions?: Prisma.SessionUpdateManyWithoutUserNestedInput;
    passwordResetTokens?: Prisma.PasswordResetTokenUpdateManyWithoutUserNestedInput;
};
export type UserUncheckedUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    email?: Prisma.StringFieldUpdateOperationsInput | string;
    passwordHash?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    fullName?: Prisma.StringFieldUpdateOperationsInput | string;
    role?: Prisma.StringFieldUpdateOperationsInput | string;
    status?: Prisma.StringFieldUpdateOperationsInput | string;
    googleId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    avatarUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    mfaEnabled?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    mfaSecret?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    mfaRecoveryCodes?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    lastLoginAt?: Prisma.NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    sessions?: Prisma.SessionUncheckedUpdateManyWithoutUserNestedInput;
    passwordResetTokens?: Prisma.PasswordResetTokenUncheckedUpdateManyWithoutUserNestedInput;
};
export type UserCreateManyInput = {
    id?: string;
    email: string;
    passwordHash?: string | null;
    fullName: string;
    role: string;
    status?: string;
    googleId?: string | null;
    avatarUrl?: string | null;
    mfaEnabled?: boolean;
    mfaSecret?: string | null;
    mfaRecoveryCodes?: string | null;
    lastLoginAt?: Date | string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
};
export type UserUpdateManyMutationInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    email?: Prisma.StringFieldUpdateOperationsInput | string;
    passwordHash?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    fullName?: Prisma.StringFieldUpdateOperationsInput | string;
    role?: Prisma.StringFieldUpdateOperationsInput | string;
    status?: Prisma.StringFieldUpdateOperationsInput | string;
    googleId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    avatarUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    mfaEnabled?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    mfaSecret?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    mfaRecoveryCodes?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    lastLoginAt?: Prisma.NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type UserUncheckedUpdateManyInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    email?: Prisma.StringFieldUpdateOperationsInput | string;
    passwordHash?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    fullName?: Prisma.StringFieldUpdateOperationsInput | string;
    role?: Prisma.StringFieldUpdateOperationsInput | string;
    status?: Prisma.StringFieldUpdateOperationsInput | string;
    googleId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    avatarUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    mfaEnabled?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    mfaSecret?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    mfaRecoveryCodes?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    lastLoginAt?: Prisma.NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type UserCountOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    email?: Prisma.SortOrder;
    passwordHash?: Prisma.SortOrder;
    fullName?: Prisma.SortOrder;
    role?: Prisma.SortOrder;
    status?: Prisma.SortOrder;
    googleId?: Prisma.SortOrder;
    avatarUrl?: Prisma.SortOrder;
    mfaEnabled?: Prisma.SortOrder;
    mfaSecret?: Prisma.SortOrder;
    mfaRecoveryCodes?: Prisma.SortOrder;
    lastLoginAt?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
};
export type UserMaxOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    email?: Prisma.SortOrder;
    passwordHash?: Prisma.SortOrder;
    fullName?: Prisma.SortOrder;
    role?: Prisma.SortOrder;
    status?: Prisma.SortOrder;
    googleId?: Prisma.SortOrder;
    avatarUrl?: Prisma.SortOrder;
    mfaEnabled?: Prisma.SortOrder;
    mfaSecret?: Prisma.SortOrder;
    mfaRecoveryCodes?: Prisma.SortOrder;
    lastLoginAt?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
};
export type UserMinOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    email?: Prisma.SortOrder;
    passwordHash?: Prisma.SortOrder;
    fullName?: Prisma.SortOrder;
    role?: Prisma.SortOrder;
    status?: Prisma.SortOrder;
    googleId?: Prisma.SortOrder;
    avatarUrl?: Prisma.SortOrder;
    mfaEnabled?: Prisma.SortOrder;
    mfaSecret?: Prisma.SortOrder;
    mfaRecoveryCodes?: Prisma.SortOrder;
    lastLoginAt?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
};
export type UserScalarRelationFilter = {
    is?: Prisma.UserWhereInput;
    isNot?: Prisma.UserWhereInput;
};
export type StringFieldUpdateOperationsInput = {
    set?: string;
};
export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null;
};
export type BoolFieldUpdateOperationsInput = {
    set?: boolean;
};
export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null;
};
export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string;
};
export type UserCreateNestedOneWithoutSessionsInput = {
    create?: Prisma.XOR<Prisma.UserCreateWithoutSessionsInput, Prisma.UserUncheckedCreateWithoutSessionsInput>;
    connectOrCreate?: Prisma.UserCreateOrConnectWithoutSessionsInput;
    connect?: Prisma.UserWhereUniqueInput;
};
export type UserUpdateOneRequiredWithoutSessionsNestedInput = {
    create?: Prisma.XOR<Prisma.UserCreateWithoutSessionsInput, Prisma.UserUncheckedCreateWithoutSessionsInput>;
    connectOrCreate?: Prisma.UserCreateOrConnectWithoutSessionsInput;
    upsert?: Prisma.UserUpsertWithoutSessionsInput;
    connect?: Prisma.UserWhereUniqueInput;
    update?: Prisma.XOR<Prisma.XOR<Prisma.UserUpdateToOneWithWhereWithoutSessionsInput, Prisma.UserUpdateWithoutSessionsInput>, Prisma.UserUncheckedUpdateWithoutSessionsInput>;
};
export type UserCreateNestedOneWithoutPasswordResetTokensInput = {
    create?: Prisma.XOR<Prisma.UserCreateWithoutPasswordResetTokensInput, Prisma.UserUncheckedCreateWithoutPasswordResetTokensInput>;
    connectOrCreate?: Prisma.UserCreateOrConnectWithoutPasswordResetTokensInput;
    connect?: Prisma.UserWhereUniqueInput;
};
export type UserUpdateOneRequiredWithoutPasswordResetTokensNestedInput = {
    create?: Prisma.XOR<Prisma.UserCreateWithoutPasswordResetTokensInput, Prisma.UserUncheckedCreateWithoutPasswordResetTokensInput>;
    connectOrCreate?: Prisma.UserCreateOrConnectWithoutPasswordResetTokensInput;
    upsert?: Prisma.UserUpsertWithoutPasswordResetTokensInput;
    connect?: Prisma.UserWhereUniqueInput;
    update?: Prisma.XOR<Prisma.XOR<Prisma.UserUpdateToOneWithWhereWithoutPasswordResetTokensInput, Prisma.UserUpdateWithoutPasswordResetTokensInput>, Prisma.UserUncheckedUpdateWithoutPasswordResetTokensInput>;
};
export type UserCreateWithoutSessionsInput = {
    id?: string;
    email: string;
    passwordHash?: string | null;
    fullName: string;
    role: string;
    status?: string;
    googleId?: string | null;
    avatarUrl?: string | null;
    mfaEnabled?: boolean;
    mfaSecret?: string | null;
    mfaRecoveryCodes?: string | null;
    lastLoginAt?: Date | string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    passwordResetTokens?: Prisma.PasswordResetTokenCreateNestedManyWithoutUserInput;
};
export type UserUncheckedCreateWithoutSessionsInput = {
    id?: string;
    email: string;
    passwordHash?: string | null;
    fullName: string;
    role: string;
    status?: string;
    googleId?: string | null;
    avatarUrl?: string | null;
    mfaEnabled?: boolean;
    mfaSecret?: string | null;
    mfaRecoveryCodes?: string | null;
    lastLoginAt?: Date | string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    passwordResetTokens?: Prisma.PasswordResetTokenUncheckedCreateNestedManyWithoutUserInput;
};
export type UserCreateOrConnectWithoutSessionsInput = {
    where: Prisma.UserWhereUniqueInput;
    create: Prisma.XOR<Prisma.UserCreateWithoutSessionsInput, Prisma.UserUncheckedCreateWithoutSessionsInput>;
};
export type UserUpsertWithoutSessionsInput = {
    update: Prisma.XOR<Prisma.UserUpdateWithoutSessionsInput, Prisma.UserUncheckedUpdateWithoutSessionsInput>;
    create: Prisma.XOR<Prisma.UserCreateWithoutSessionsInput, Prisma.UserUncheckedCreateWithoutSessionsInput>;
    where?: Prisma.UserWhereInput;
};
export type UserUpdateToOneWithWhereWithoutSessionsInput = {
    where?: Prisma.UserWhereInput;
    data: Prisma.XOR<Prisma.UserUpdateWithoutSessionsInput, Prisma.UserUncheckedUpdateWithoutSessionsInput>;
};
export type UserUpdateWithoutSessionsInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    email?: Prisma.StringFieldUpdateOperationsInput | string;
    passwordHash?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    fullName?: Prisma.StringFieldUpdateOperationsInput | string;
    role?: Prisma.StringFieldUpdateOperationsInput | string;
    status?: Prisma.StringFieldUpdateOperationsInput | string;
    googleId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    avatarUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    mfaEnabled?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    mfaSecret?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    mfaRecoveryCodes?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    lastLoginAt?: Prisma.NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    passwordResetTokens?: Prisma.PasswordResetTokenUpdateManyWithoutUserNestedInput;
};
export type UserUncheckedUpdateWithoutSessionsInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    email?: Prisma.StringFieldUpdateOperationsInput | string;
    passwordHash?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    fullName?: Prisma.StringFieldUpdateOperationsInput | string;
    role?: Prisma.StringFieldUpdateOperationsInput | string;
    status?: Prisma.StringFieldUpdateOperationsInput | string;
    googleId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    avatarUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    mfaEnabled?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    mfaSecret?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    mfaRecoveryCodes?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    lastLoginAt?: Prisma.NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    passwordResetTokens?: Prisma.PasswordResetTokenUncheckedUpdateManyWithoutUserNestedInput;
};
export type UserCreateWithoutPasswordResetTokensInput = {
    id?: string;
    email: string;
    passwordHash?: string | null;
    fullName: string;
    role: string;
    status?: string;
    googleId?: string | null;
    avatarUrl?: string | null;
    mfaEnabled?: boolean;
    mfaSecret?: string | null;
    mfaRecoveryCodes?: string | null;
    lastLoginAt?: Date | string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    sessions?: Prisma.SessionCreateNestedManyWithoutUserInput;
};
export type UserUncheckedCreateWithoutPasswordResetTokensInput = {
    id?: string;
    email: string;
    passwordHash?: string | null;
    fullName: string;
    role: string;
    status?: string;
    googleId?: string | null;
    avatarUrl?: string | null;
    mfaEnabled?: boolean;
    mfaSecret?: string | null;
    mfaRecoveryCodes?: string | null;
    lastLoginAt?: Date | string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    sessions?: Prisma.SessionUncheckedCreateNestedManyWithoutUserInput;
};
export type UserCreateOrConnectWithoutPasswordResetTokensInput = {
    where: Prisma.UserWhereUniqueInput;
    create: Prisma.XOR<Prisma.UserCreateWithoutPasswordResetTokensInput, Prisma.UserUncheckedCreateWithoutPasswordResetTokensInput>;
};
export type UserUpsertWithoutPasswordResetTokensInput = {
    update: Prisma.XOR<Prisma.UserUpdateWithoutPasswordResetTokensInput, Prisma.UserUncheckedUpdateWithoutPasswordResetTokensInput>;
    create: Prisma.XOR<Prisma.UserCreateWithoutPasswordResetTokensInput, Prisma.UserUncheckedCreateWithoutPasswordResetTokensInput>;
    where?: Prisma.UserWhereInput;
};
export type UserUpdateToOneWithWhereWithoutPasswordResetTokensInput = {
    where?: Prisma.UserWhereInput;
    data: Prisma.XOR<Prisma.UserUpdateWithoutPasswordResetTokensInput, Prisma.UserUncheckedUpdateWithoutPasswordResetTokensInput>;
};
export type UserUpdateWithoutPasswordResetTokensInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    email?: Prisma.StringFieldUpdateOperationsInput | string;
    passwordHash?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    fullName?: Prisma.StringFieldUpdateOperationsInput | string;
    role?: Prisma.StringFieldUpdateOperationsInput | string;
    status?: Prisma.StringFieldUpdateOperationsInput | string;
    googleId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    avatarUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    mfaEnabled?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    mfaSecret?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    mfaRecoveryCodes?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    lastLoginAt?: Prisma.NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    sessions?: Prisma.SessionUpdateManyWithoutUserNestedInput;
};
export type UserUncheckedUpdateWithoutPasswordResetTokensInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    email?: Prisma.StringFieldUpdateOperationsInput | string;
    passwordHash?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    fullName?: Prisma.StringFieldUpdateOperationsInput | string;
    role?: Prisma.StringFieldUpdateOperationsInput | string;
    status?: Prisma.StringFieldUpdateOperationsInput | string;
    googleId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    avatarUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    mfaEnabled?: Prisma.BoolFieldUpdateOperationsInput | boolean;
    mfaSecret?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    mfaRecoveryCodes?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    lastLoginAt?: Prisma.NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    sessions?: Prisma.SessionUncheckedUpdateManyWithoutUserNestedInput;
};
export type UserCountOutputType = {
    sessions: number;
    passwordResetTokens: number;
};
export type UserCountOutputTypeSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    sessions?: boolean | UserCountOutputTypeCountSessionsArgs;
    passwordResetTokens?: boolean | UserCountOutputTypeCountPasswordResetTokensArgs;
};
export type UserCountOutputTypeDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.UserCountOutputTypeSelect<ExtArgs> | null;
};
export type UserCountOutputTypeCountSessionsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.SessionWhereInput;
};
export type UserCountOutputTypeCountPasswordResetTokensArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.PasswordResetTokenWhereInput;
};
export type UserSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    email?: boolean;
    passwordHash?: boolean;
    fullName?: boolean;
    role?: boolean;
    status?: boolean;
    googleId?: boolean;
    avatarUrl?: boolean;
    mfaEnabled?: boolean;
    mfaSecret?: boolean;
    mfaRecoveryCodes?: boolean;
    lastLoginAt?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
    sessions?: boolean | Prisma.User$sessionsArgs<ExtArgs>;
    passwordResetTokens?: boolean | Prisma.User$passwordResetTokensArgs<ExtArgs>;
    _count?: boolean | Prisma.UserCountOutputTypeDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["user"]>;
export type UserSelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    email?: boolean;
    passwordHash?: boolean;
    fullName?: boolean;
    role?: boolean;
    status?: boolean;
    googleId?: boolean;
    avatarUrl?: boolean;
    mfaEnabled?: boolean;
    mfaSecret?: boolean;
    mfaRecoveryCodes?: boolean;
    lastLoginAt?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
}, ExtArgs["result"]["user"]>;
export type UserSelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    email?: boolean;
    passwordHash?: boolean;
    fullName?: boolean;
    role?: boolean;
    status?: boolean;
    googleId?: boolean;
    avatarUrl?: boolean;
    mfaEnabled?: boolean;
    mfaSecret?: boolean;
    mfaRecoveryCodes?: boolean;
    lastLoginAt?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
}, ExtArgs["result"]["user"]>;
export type UserSelectScalar = {
    id?: boolean;
    email?: boolean;
    passwordHash?: boolean;
    fullName?: boolean;
    role?: boolean;
    status?: boolean;
    googleId?: boolean;
    avatarUrl?: boolean;
    mfaEnabled?: boolean;
    mfaSecret?: boolean;
    mfaRecoveryCodes?: boolean;
    lastLoginAt?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
};
export type UserOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"id" | "email" | "passwordHash" | "fullName" | "role" | "status" | "googleId" | "avatarUrl" | "mfaEnabled" | "mfaSecret" | "mfaRecoveryCodes" | "lastLoginAt" | "createdAt" | "updatedAt", ExtArgs["result"]["user"]>;
export type UserInclude<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    sessions?: boolean | Prisma.User$sessionsArgs<ExtArgs>;
    passwordResetTokens?: boolean | Prisma.User$passwordResetTokensArgs<ExtArgs>;
    _count?: boolean | Prisma.UserCountOutputTypeDefaultArgs<ExtArgs>;
};
export type UserIncludeCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {};
export type UserIncludeUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {};
export type $UserPayload<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    name: "User";
    objects: {
        sessions: Prisma.$SessionPayload<ExtArgs>[];
        passwordResetTokens: Prisma.$PasswordResetTokenPayload<ExtArgs>[];
    };
    scalars: runtime.Types.Extensions.GetPayloadResult<{
        id: string;
        email: string;
        passwordHash: string | null;
        fullName: string;
        role: string;
        status: string;
        googleId: string | null;
        avatarUrl: string | null;
        mfaEnabled: boolean;
        mfaSecret: string | null;
        mfaRecoveryCodes: string | null;
        lastLoginAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }, ExtArgs["result"]["user"]>;
    composites: {};
};
export type UserGetPayload<S extends boolean | null | undefined | UserDefaultArgs> = runtime.Types.Result.GetResult<Prisma.$UserPayload, S>;
export type UserCountArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = Omit<UserFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
    select?: UserCountAggregateInputType | true;
};
export interface UserDelegate<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: {
        types: Prisma.TypeMap<ExtArgs>['model']['User'];
        meta: {
            name: 'User';
        };
    };
    findUnique<T extends UserFindUniqueArgs>(args: Prisma.SelectSubset<T, UserFindUniqueArgs<ExtArgs>>): Prisma.Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    findUniqueOrThrow<T extends UserFindUniqueOrThrowArgs>(args: Prisma.SelectSubset<T, UserFindUniqueOrThrowArgs<ExtArgs>>): Prisma.Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    findFirst<T extends UserFindFirstArgs>(args?: Prisma.SelectSubset<T, UserFindFirstArgs<ExtArgs>>): Prisma.Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    findFirstOrThrow<T extends UserFindFirstOrThrowArgs>(args?: Prisma.SelectSubset<T, UserFindFirstOrThrowArgs<ExtArgs>>): Prisma.Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    findMany<T extends UserFindManyArgs>(args?: Prisma.SelectSubset<T, UserFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>;
    create<T extends UserCreateArgs>(args: Prisma.SelectSubset<T, UserCreateArgs<ExtArgs>>): Prisma.Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    createMany<T extends UserCreateManyArgs>(args?: Prisma.SelectSubset<T, UserCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    createManyAndReturn<T extends UserCreateManyAndReturnArgs>(args?: Prisma.SelectSubset<T, UserCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>;
    delete<T extends UserDeleteArgs>(args: Prisma.SelectSubset<T, UserDeleteArgs<ExtArgs>>): Prisma.Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    update<T extends UserUpdateArgs>(args: Prisma.SelectSubset<T, UserUpdateArgs<ExtArgs>>): Prisma.Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    deleteMany<T extends UserDeleteManyArgs>(args?: Prisma.SelectSubset<T, UserDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    updateMany<T extends UserUpdateManyArgs>(args: Prisma.SelectSubset<T, UserUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    updateManyAndReturn<T extends UserUpdateManyAndReturnArgs>(args: Prisma.SelectSubset<T, UserUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>;
    upsert<T extends UserUpsertArgs>(args: Prisma.SelectSubset<T, UserUpsertArgs<ExtArgs>>): Prisma.Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    count<T extends UserCountArgs>(args?: Prisma.Subset<T, UserCountArgs>): Prisma.PrismaPromise<T extends runtime.Types.Utils.Record<'select', any> ? T['select'] extends true ? number : Prisma.GetScalarType<T['select'], UserCountAggregateOutputType> : number>;
    aggregate<T extends UserAggregateArgs>(args: Prisma.Subset<T, UserAggregateArgs>): Prisma.PrismaPromise<GetUserAggregateType<T>>;
    groupBy<T extends UserGroupByArgs, HasSelectOrTake extends Prisma.Or<Prisma.Extends<'skip', Prisma.Keys<T>>, Prisma.Extends<'take', Prisma.Keys<T>>>, OrderByArg extends Prisma.True extends HasSelectOrTake ? {
        orderBy: UserGroupByArgs['orderBy'];
    } : {
        orderBy?: UserGroupByArgs['orderBy'];
    }, OrderFields extends Prisma.ExcludeUnderscoreKeys<Prisma.Keys<Prisma.MaybeTupleToUnion<T['orderBy']>>>, ByFields extends Prisma.MaybeTupleToUnion<T['by']>, ByValid extends Prisma.Has<ByFields, OrderFields>, HavingFields extends Prisma.GetHavingFields<T['having']>, HavingValid extends Prisma.Has<ByFields, HavingFields>, ByEmpty extends T['by'] extends never[] ? Prisma.True : Prisma.False, InputErrors extends ByEmpty extends Prisma.True ? `Error: "by" must not be empty.` : HavingValid extends Prisma.False ? {
        [P in HavingFields]: P extends ByFields ? never : P extends string ? `Error: Field "${P}" used in "having" needs to be provided in "by".` : [
            Error,
            'Field ',
            P,
            ` in "having" needs to be provided in "by"`
        ];
    }[HavingFields] : 'take' extends Prisma.Keys<T> ? 'orderBy' extends Prisma.Keys<T> ? ByValid extends Prisma.True ? {} : {
        [P in OrderFields]: P extends ByFields ? never : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
    }[OrderFields] : 'Error: If you provide "take", you also need to provide "orderBy"' : 'skip' extends Prisma.Keys<T> ? 'orderBy' extends Prisma.Keys<T> ? ByValid extends Prisma.True ? {} : {
        [P in OrderFields]: P extends ByFields ? never : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
    }[OrderFields] : 'Error: If you provide "skip", you also need to provide "orderBy"' : ByValid extends Prisma.True ? {} : {
        [P in OrderFields]: P extends ByFields ? never : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
    }[OrderFields]>(args: Prisma.SubsetIntersection<T, UserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>;
    readonly fields: UserFieldRefs;
}
export interface Prisma__UserClient<T, Null = never, ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise";
    sessions<T extends Prisma.User$sessionsArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.User$sessionsArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>;
    passwordResetTokens<T extends Prisma.User$passwordResetTokensArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.User$passwordResetTokensArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$PasswordResetTokenPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>;
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): runtime.Types.Utils.JsPromise<TResult1 | TResult2>;
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): runtime.Types.Utils.JsPromise<T | TResult>;
    finally(onfinally?: (() => void) | undefined | null): runtime.Types.Utils.JsPromise<T>;
}
export interface UserFieldRefs {
    readonly id: Prisma.FieldRef<"User", 'String'>;
    readonly email: Prisma.FieldRef<"User", 'String'>;
    readonly passwordHash: Prisma.FieldRef<"User", 'String'>;
    readonly fullName: Prisma.FieldRef<"User", 'String'>;
    readonly role: Prisma.FieldRef<"User", 'String'>;
    readonly status: Prisma.FieldRef<"User", 'String'>;
    readonly googleId: Prisma.FieldRef<"User", 'String'>;
    readonly avatarUrl: Prisma.FieldRef<"User", 'String'>;
    readonly mfaEnabled: Prisma.FieldRef<"User", 'Boolean'>;
    readonly mfaSecret: Prisma.FieldRef<"User", 'String'>;
    readonly mfaRecoveryCodes: Prisma.FieldRef<"User", 'String'>;
    readonly lastLoginAt: Prisma.FieldRef<"User", 'DateTime'>;
    readonly createdAt: Prisma.FieldRef<"User", 'DateTime'>;
    readonly updatedAt: Prisma.FieldRef<"User", 'DateTime'>;
}
export type UserFindUniqueArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.UserSelect<ExtArgs> | null;
    omit?: Prisma.UserOmit<ExtArgs> | null;
    include?: Prisma.UserInclude<ExtArgs> | null;
    where: Prisma.UserWhereUniqueInput;
};
export type UserFindUniqueOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.UserSelect<ExtArgs> | null;
    omit?: Prisma.UserOmit<ExtArgs> | null;
    include?: Prisma.UserInclude<ExtArgs> | null;
    where: Prisma.UserWhereUniqueInput;
};
export type UserFindFirstArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.UserSelect<ExtArgs> | null;
    omit?: Prisma.UserOmit<ExtArgs> | null;
    include?: Prisma.UserInclude<ExtArgs> | null;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput | Prisma.UserOrderByWithRelationInput[];
    cursor?: Prisma.UserWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.UserScalarFieldEnum | Prisma.UserScalarFieldEnum[];
};
export type UserFindFirstOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.UserSelect<ExtArgs> | null;
    omit?: Prisma.UserOmit<ExtArgs> | null;
    include?: Prisma.UserInclude<ExtArgs> | null;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput | Prisma.UserOrderByWithRelationInput[];
    cursor?: Prisma.UserWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.UserScalarFieldEnum | Prisma.UserScalarFieldEnum[];
};
export type UserFindManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.UserSelect<ExtArgs> | null;
    omit?: Prisma.UserOmit<ExtArgs> | null;
    include?: Prisma.UserInclude<ExtArgs> | null;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput | Prisma.UserOrderByWithRelationInput[];
    cursor?: Prisma.UserWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.UserScalarFieldEnum | Prisma.UserScalarFieldEnum[];
};
export type UserCreateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.UserSelect<ExtArgs> | null;
    omit?: Prisma.UserOmit<ExtArgs> | null;
    include?: Prisma.UserInclude<ExtArgs> | null;
    data: Prisma.XOR<Prisma.UserCreateInput, Prisma.UserUncheckedCreateInput>;
};
export type UserCreateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    data: Prisma.UserCreateManyInput | Prisma.UserCreateManyInput[];
    skipDuplicates?: boolean;
};
export type UserCreateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.UserSelectCreateManyAndReturn<ExtArgs> | null;
    omit?: Prisma.UserOmit<ExtArgs> | null;
    data: Prisma.UserCreateManyInput | Prisma.UserCreateManyInput[];
    skipDuplicates?: boolean;
};
export type UserUpdateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.UserSelect<ExtArgs> | null;
    omit?: Prisma.UserOmit<ExtArgs> | null;
    include?: Prisma.UserInclude<ExtArgs> | null;
    data: Prisma.XOR<Prisma.UserUpdateInput, Prisma.UserUncheckedUpdateInput>;
    where: Prisma.UserWhereUniqueInput;
};
export type UserUpdateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    data: Prisma.XOR<Prisma.UserUpdateManyMutationInput, Prisma.UserUncheckedUpdateManyInput>;
    where?: Prisma.UserWhereInput;
    limit?: number;
};
export type UserUpdateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.UserSelectUpdateManyAndReturn<ExtArgs> | null;
    omit?: Prisma.UserOmit<ExtArgs> | null;
    data: Prisma.XOR<Prisma.UserUpdateManyMutationInput, Prisma.UserUncheckedUpdateManyInput>;
    where?: Prisma.UserWhereInput;
    limit?: number;
};
export type UserUpsertArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.UserSelect<ExtArgs> | null;
    omit?: Prisma.UserOmit<ExtArgs> | null;
    include?: Prisma.UserInclude<ExtArgs> | null;
    where: Prisma.UserWhereUniqueInput;
    create: Prisma.XOR<Prisma.UserCreateInput, Prisma.UserUncheckedCreateInput>;
    update: Prisma.XOR<Prisma.UserUpdateInput, Prisma.UserUncheckedUpdateInput>;
};
export type UserDeleteArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.UserSelect<ExtArgs> | null;
    omit?: Prisma.UserOmit<ExtArgs> | null;
    include?: Prisma.UserInclude<ExtArgs> | null;
    where: Prisma.UserWhereUniqueInput;
};
export type UserDeleteManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.UserWhereInput;
    limit?: number;
};
export type User$sessionsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.SessionSelect<ExtArgs> | null;
    omit?: Prisma.SessionOmit<ExtArgs> | null;
    include?: Prisma.SessionInclude<ExtArgs> | null;
    where?: Prisma.SessionWhereInput;
    orderBy?: Prisma.SessionOrderByWithRelationInput | Prisma.SessionOrderByWithRelationInput[];
    cursor?: Prisma.SessionWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.SessionScalarFieldEnum | Prisma.SessionScalarFieldEnum[];
};
export type User$passwordResetTokensArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PasswordResetTokenSelect<ExtArgs> | null;
    omit?: Prisma.PasswordResetTokenOmit<ExtArgs> | null;
    include?: Prisma.PasswordResetTokenInclude<ExtArgs> | null;
    where?: Prisma.PasswordResetTokenWhereInput;
    orderBy?: Prisma.PasswordResetTokenOrderByWithRelationInput | Prisma.PasswordResetTokenOrderByWithRelationInput[];
    cursor?: Prisma.PasswordResetTokenWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.PasswordResetTokenScalarFieldEnum | Prisma.PasswordResetTokenScalarFieldEnum[];
};
export type UserDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.UserSelect<ExtArgs> | null;
    omit?: Prisma.UserOmit<ExtArgs> | null;
    include?: Prisma.UserInclude<ExtArgs> | null;
};
export {};
