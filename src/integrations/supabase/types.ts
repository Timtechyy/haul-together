export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      deliveries: {
        Row: {
          accepted_at: string | null
          completed_at: string | null
          created_at: string
          customer_confirmed_at: string | null
          customer_id: string
          customer_rating: number | null
          declined_driver_ids: string[] | null
          delivered_at: string | null
          delivery_lat: number | null
          delivery_lng: number | null
          delivery_location: string
          driver_confirmed_at: string | null
          driver_id: string | null
          estimated_distance: number | null
          id: string
          item_description: string
          item_type: string | null
          picked_up_at: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          pickup_location: string
          price: number | null
          quantity: number | null
          receipt_url: string | null
          status: string
          updated_at: string
          vehicle_type: string | null
        }
        Insert: {
          accepted_at?: string | null
          completed_at?: string | null
          created_at?: string
          customer_confirmed_at?: string | null
          customer_id: string
          customer_rating?: number | null
          declined_driver_ids?: string[] | null
          delivered_at?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_location: string
          driver_confirmed_at?: string | null
          driver_id?: string | null
          estimated_distance?: number | null
          id?: string
          item_description: string
          item_type?: string | null
          picked_up_at?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_location: string
          price?: number | null
          quantity?: number | null
          receipt_url?: string | null
          status?: string
          updated_at?: string
          vehicle_type?: string | null
        }
        Update: {
          accepted_at?: string | null
          completed_at?: string | null
          created_at?: string
          customer_confirmed_at?: string | null
          customer_id?: string
          customer_rating?: number | null
          declined_driver_ids?: string[] | null
          delivered_at?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_location?: string
          driver_confirmed_at?: string | null
          driver_id?: string | null
          estimated_distance?: number | null
          id?: string
          item_description?: string
          item_type?: string | null
          picked_up_at?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_location?: string
          price?: number | null
          quantity?: number | null
          receipt_url?: string | null
          status?: string
          updated_at?: string
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_deliveries_driver_profile"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_vehicles: {
        Row: {
          color: string | null
          created_at: string
          current_lat: number | null
          current_lng: number | null
          id: string
          insurance_number: string | null
          is_online: boolean | null
          last_location_update: string | null
          license_plate: string
          make: string
          model: string
          tracking_consent: boolean
          updated_at: string
          user_id: string
          vehicle_type: string
          year: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          id?: string
          insurance_number?: string | null
          is_online?: boolean | null
          last_location_update?: string | null
          license_plate: string
          make: string
          model: string
          tracking_consent?: boolean
          updated_at?: string
          user_id: string
          vehicle_type: string
          year: number
        }
        Update: {
          color?: string | null
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          id?: string
          insurance_number?: string | null
          is_online?: boolean | null
          last_location_update?: string | null
          license_plate?: string
          make?: string
          model?: string
          tracking_consent?: boolean
          updated_at?: string
          user_id?: string
          vehicle_type?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_driver_vehicles_profiles"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_verifications: {
        Row: {
          session_id: string
          submitted_at: string
          updated_at: string
          user_id: string
          veriff_session_id: string | null
          verification_status: string
          verified_at: string | null
        }
        Insert: {
          session_id?: string
          submitted_at?: string
          updated_at?: string
          user_id: string
          veriff_session_id?: string | null
          verification_status?: string
          verified_at?: string | null
        }
        Update: {
          session_id?: string
          submitted_at?: string
          updated_at?: string
          user_id?: string
          veriff_session_id?: string | null
          verification_status?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_driver_verification"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          first_name: string | null
          gender: string | null
          id: string
          last_name: string | null
          phone: string | null
          stripe_connect_id: string | null
          stripe_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          gender?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          stripe_connect_id?: string | null
          stripe_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          stripe_connect_id?: string | null
          stripe_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_delivery: {
        Args: { p_delivery_id: string; p_driver_id: string }
        Returns: {
          accepted_at: string | null
          completed_at: string | null
          created_at: string
          customer_confirmed_at: string | null
          customer_id: string
          customer_rating: number | null
          declined_driver_ids: string[] | null
          delivered_at: string | null
          delivery_lat: number | null
          delivery_lng: number | null
          delivery_location: string
          driver_confirmed_at: string | null
          driver_id: string | null
          estimated_distance: number | null
          id: string
          item_description: string
          item_type: string | null
          picked_up_at: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          pickup_location: string
          price: number | null
          quantity: number | null
          receipt_url: string | null
          status: string
          updated_at: string
          vehicle_type: string | null
        }
        SetofOptions: {
          from: "*"
          to: "deliveries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_delivery: {
        Args: { p_delivery_id: string; p_driver_id: string }
        Returns: Json
      }
      customer_confirm_delivery: {
        Args: { delivery_id: string }
        Returns: {
          accepted_at: string | null
          completed_at: string | null
          created_at: string
          customer_confirmed_at: string | null
          customer_id: string
          customer_rating: number | null
          declined_driver_ids: string[] | null
          delivered_at: string | null
          delivery_lat: number | null
          delivery_lng: number | null
          delivery_location: string
          driver_confirmed_at: string | null
          driver_id: string | null
          estimated_distance: number | null
          id: string
          item_description: string
          item_type: string | null
          picked_up_at: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          pickup_location: string
          price: number | null
          quantity: number | null
          receipt_url: string | null
          status: string
          updated_at: string
          vehicle_type: string | null
        }
        SetofOptions: {
          from: "*"
          to: "deliveries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      distance_calculator: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      driver_confirm_delivery: {
        Args: { delivery_id: string }
        Returns: {
          accepted_at: string | null
          completed_at: string | null
          created_at: string
          customer_confirmed_at: string | null
          customer_id: string
          customer_rating: number | null
          declined_driver_ids: string[] | null
          delivered_at: string | null
          delivery_lat: number | null
          delivery_lng: number | null
          delivery_location: string
          driver_confirmed_at: string | null
          driver_id: string | null
          estimated_distance: number | null
          id: string
          item_description: string
          item_type: string | null
          picked_up_at: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          pickup_location: string
          price: number | null
          quantity: number | null
          receipt_url: string | null
          status: string
          updated_at: string
          vehicle_type: string | null
        }
        SetofOptions: {
          from: "*"
          to: "deliveries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "driver" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["driver", "user"],
    },
  },
} as const
