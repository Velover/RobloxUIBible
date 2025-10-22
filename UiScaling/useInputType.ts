import { DeviceTypeHandler, EInputType } from "@rbxts/input-actions";
import { useEffect, useState } from "@rbxts/react";

export function useInputType(): EInputType {
  const [input_type, SetInputType] = useState(EInputType.KeyboardAndMouse);

  useEffect(() => {
    SetInputType(DeviceTypeHandler.GetMainInputType());
    const connection = DeviceTypeHandler.OnInputTypeChanged.Connect(
      (input_type) => {
        SetInputType(input_type);
      }
    );

    return () => connection.Disconnect();
  }, []);

  return input_type;
}
